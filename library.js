'use strict';

const nconf = nodebb.require('nconf');
const OAuth2Strategy = require('passport-oauth2');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const User = nodebb.require('./src/user');
const meta = nodebb.require('./src/meta');
const db = nodebb.require('./src/database');
const passport = nodebb.require('passport');

const constants = Object.freeze({
	name: 'Telegram OIDC',
	admin: {
		route: '/plugins/sso-telegram-oidc',
		icon: 'fa-telegram',
	},
});

const TelegramOidc = {
	settings: {
		id: process.env.SSO_TELEGRAM_CLIENT_ID || undefined,
		secret: process.env.SSO_TELEGRAM_CLIENT_SECRET || undefined,
		autoconfirm: false,
		placeholderEmail: true,
		disableRegistration: false,
	},
};

// Configure JWKS client to verify JWTs signed by Telegram
const client = jwksClient({
	jwksUri: 'https://oauth.telegram.org/.well-known/jwks.json',
	cache: true,
	rateLimit: true,
	jwksRequestsPerMinute: 5,
});

function getSigningKey(header, callback) {
	client.getSigningKey(header.kid, function (err, key) {
		if (err) {
			return callback(err);
		}
		const signingKey = key.getPublicKey();
		callback(null, signingKey);
	});
}

// Custom Passport strategy class for Telegram OIDC
class TelegramOidcStrategy extends OAuth2Strategy {
	constructor(options, verify) {
		options = options || {};
		options.authorizationURL = options.authorizationURL || 'https://oauth.telegram.org/auth';
		options.tokenURL = options.tokenURL || 'https://oauth.telegram.org/token';
		super(options, verify);
		this.name = 'telegram-oidc';
	}
}

TelegramOidc.init = async function (data) {
	const hostHelpers = nodebb.require('./src/routes/helpers');

	// Set up admin panel route
	hostHelpers.setupAdminPageRoute(data.router, `/admin/plugins/sso-telegram-oidc`, (req, res) => {
		res.render('admin/plugins/sso-telegram-oidc', {
			title: constants.name,
			baseUrl: nconf.get('url'),
		});
	});

	// Set up deauth page and action
	hostHelpers.setupPageRoute(data.router, '/deauth/telegram-oidc', [data.middleware.requireUser], (req, res) => {
		res.render('plugins/sso-telegram-oidc/deauth', {
			service: constants.name,
		});
	});

	data.router.post('/deauth/telegram-oidc', [data.middleware.requireUser, data.middleware.applyCSRF], hostHelpers.tryRoute(async (req, res) => {
		await TelegramOidc.deleteUserData({
			uid: req.user.uid,
		});
		res.redirect(`${nconf.get('relative_path')}/me/edit`);
	}));

	  // Load settings from config
  const loadedSettings = await meta.settings.get('sso-telegram-oidc');
  if (loadedSettings.id) {
    TelegramOidc.settings.id = loadedSettings.id;
  }
  if (loadedSettings.secret) {
    TelegramOidc.settings.secret = loadedSettings.secret;
  }
  TelegramOidc.settings.autoconfirm = loadedSettings.autoconfirm === 'on';
  TelegramOidc.settings.placeholderEmail = loadedSettings.placeholderEmail === 'on';
  TelegramOidc.settings.disableRegistration = loadedSettings.disableRegistration === 'on';
  // New optional setting to skip JWT verification (useful when JWKS endpoint is unreachable)
  TelegramOidc.settings.disableJwtVerification = loadedSettings.disableJwtVerification === 'on';
};

TelegramOidc.filterConfigGet = function (data) {
	// Expose styling or configuration data to client side templates if needed
	data['sso-telegram-oidc'] = {};
	return data;
};

TelegramOidc.filterAuthInit = function (strategies) {
	if (TelegramOidc.settings.id && TelegramOidc.settings.secret) {
		passport.use(new TelegramOidcStrategy({
			clientID: TelegramOidc.settings.id,
			clientSecret: TelegramOidc.settings.secret,
			callbackURL: `${nconf.get('url')}/auth/telegram-oidc/callback`,
			passReqToCallback: true,
			scope: ['openid', 'profile', 'email'],
		}, async (req, accessToken, refreshToken, params, profile, done) => {
			try {
				const idToken = params.id_token;
				if (!idToken) {
					return done(new Error('No ID Token received from Telegram OIDC'));
				}

				// Cryptographically verify ID Token – optionally skip verification
        if (TelegramOidc.settings.disableJwtVerification) {
          // Decode without verification (trust the source for internal testing only)
          const decoded = jwt.decode(idToken);
          if (!decoded) {
            return done(new Error('Failed to decode ID Token'));
          }
          proceedWithDecoded(decoded);
        } else {
          jwt.verify(idToken, getSigningKey, {
            issuer: 'https://oauth.telegram.org',
            audience: TelegramOidc.settings.id,
          }, async (err, decoded) => {
            if (err) {
              return done(err);
            }
            proceedWithDecoded(decoded);
          });
        }
        async function proceedWithDecoded(decoded) {
          const telegramId = String(decoded.sub || decoded.id);
          const displayName = decoded.name || '';
          const username = decoded.preferred_username || `tg_${telegramId}`;
          const email = decoded.email || '';
          const picture = decoded.picture || '';

					// If user is already logged in, associate their Telegram account
					if (req?.user?.uid && req.user.uid > 0) {
						await Promise.all([
							User.setUserField(req.user.uid, 'telegramid', telegramId),
							db.setObjectField('telegramid:uid', telegramId, req.user.uid),
						]);
						return done(null, req.user);
					}

					// Authenticate or register the user
					const { queued, uid, message } = await TelegramOidc.login(
						req, telegramId, username, displayName, email, picture
					);

					if (queued) {
						return done(null, false, { message });
					}

					done(null, { uid });
				});
			} catch (err) {
				done(err);
			}
		}));

		// Register the button style and endpoints with NodeBB auth system
		strategies.push({
			name: 'telegram-oidc',
			url: '/auth/telegram-oidc',
			callbackURL: '/auth/telegram-oidc/callback',
			icon: constants.admin.icon,
			icons: {
				normal: 'fa-brands fa-telegram',
				square: 'fa-brands fa-telegram',
			},
			        labels: {
          login: '[[social:sign-in-with-telegram]]',
          register: '[[social:sign-up-with-telegram]]',
        },
			color: '#32afed',
			scope: 'openid profile email',
		});
	}

	return strategies;
};

// Add Telegram ID to the whitelist of user fields
TelegramOidc.filterUserWhitelistFields = function (data) {
	data.whitelist.push('telegramid');
	return data;
};

// Show connected status in user's profile settings (Linked Accounts)
TelegramOidc.filterAuthList = async function (data) {
	const telegramid = await User.getUserField(data.uid, 'telegramid');
	if (telegramid) {
		data.associations.push({
			associated: true,
			url: `https://t.me/${telegramid}`, // placeholder or bot profile link
			deauthUrl: `${nconf.get('url')}/deauth/telegram-oidc`,
			name: constants.name,
			icon: constants.admin.icon,
		});
	} else {
		data.associations.push({
			associated: false,
			url: `${nconf.get('url')}/auth/telegram-oidc`,
			name: constants.name,
			icon: constants.admin.icon,
		});
	}
	return data;
};

// Handles login or registration logic
TelegramOidc.login = async function (req, telegramId, username, displayName, email, picture) {
	// Look up user by Telegram ID
	let uid = await TelegramOidc.getUidByTelegramId(telegramId);
	if (uid) {
		return { uid };
	}

	let targetEmail = email;
	// Fallback to placeholder email if enabled
	if (!targetEmail && TelegramOidc.settings.placeholderEmail) {
		targetEmail = `${username || telegramId}@telegram.local`;
	}

	// Link Telegram account if user with the same email already exists
	if (targetEmail) {
		uid = await User.getUidByEmail(targetEmail);
		if (uid) {
			await Promise.all([
				User.setUserField(uid, 'telegramid', telegramId),
				db.setObjectField('telegramid:uid', telegramId, uid),
			]);
			return { uid };
		}
	}

	if (TelegramOidc.settings.disableRegistration) {
		throw new Error('[[error:sso-registration-disabled, Telegram]]');
	}

	// Ensure username is unique in NodeBB
	let finalUsername = username || `tg_${telegramId}`;
	const usernameExists = await User.getUidByUsername(finalUsername);
	if (usernameExists) {
		finalUsername = `${finalUsername}_${telegramId.substring(0, 4)}`;
	}

	const userData = {
		telegramid: telegramId,
		username: finalUsername,
		email: targetEmail,
		fullname: displayName,
	};

	if (picture && canSetProfilePicture()) {
		userData.picture = picture;
	}

	// Create new user or add to approval queue
	return await User.createOrQueue(req, userData, {
		emailVerification: TelegramOidc.settings.autoconfirm ? 'verify' : 'send',
	});
};

// Support registration/approval queue if enabled in NodeBB core settings
TelegramOidc.addToApprovalQueue = async (hookData) => {
	await saveTelegramSpecificData(hookData.data, hookData.userData);
	return hookData;
};

TelegramOidc.filterUserCreate = async (hookData) => {
	await saveTelegramSpecificData(hookData.user, hookData.data);
	return hookData;
};

async function saveTelegramSpecificData(targetObj, sourceObj) {
	const { telegramid, picture } = sourceObj;
	if (telegramid) {
		const uid = await TelegramOidc.getUidByTelegramId(telegramid);
		if (uid) {
			throw new Error('[[error:sso-account-exists, Telegram]]');
		}
		targetObj.telegramid = telegramid;
		if (picture && canSetProfilePicture()) {
			targetObj.picture = picture;
			targetObj.uploadedpicture = picture;
		}
	}
}

function canSetProfilePicture() {
	const minimumReputation = meta.config['min:rep:profile-picture'];
	const isReputationDisabled = meta.config['reputation:disabled'];
	const { allowProfileImageUploads } = meta.config;
	return Boolean(allowProfileImageUploads) &&
		(Boolean(isReputationDisabled) || !(minimumReputation > 0));
}

// Triggered after a user is created
TelegramOidc.actionUserCreate = async (hookData) => {
	const { uid } = hookData.user;
	const telegramid = await User.getUserField(uid, 'telegramid');
	if (telegramid) {
		await db.setObjectField('telegramid:uid', telegramid, uid);
	}
};

TelegramOidc.filterUserGetRegistrationQueue = async (hookData) => {
	const { users } = hookData;
	users.forEach((user) => {
		if (user?.telegramid) {
			user.sso = {
				icon: constants.admin.icon,
				name: constants.name,
			};
		}
	});
	return hookData;
};

TelegramOidc.getUidByTelegramId = async function (telegramid) {
	return await db.getObjectField('telegramid:uid', telegramid);
};

// Add item to ACP navigation menu
TelegramOidc.addAdminMenuItem = function (custom_header) {
	custom_header.authentication.push({
		route: constants.admin.route,
		icon: constants.admin.icon,
		name: constants.name,
	});

	return custom_header;
};

// Clean up mappings when a user is deleted
TelegramOidc.deleteUserData = async function (data) {
	const { uid } = data;
	const telegramid = await User.getUserField(uid, 'telegramid');
	if (telegramid) {
		await db.deleteObjectField('telegramid:uid', telegramid);
		await db.deleteObjectField(`user:${uid}`, 'telegramid');
	}
};

module.exports = TelegramOidc;
