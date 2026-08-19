'use strict';

define('admin/plugins/sso-telegram-oidc', ['settings', 'alerts'], function (Settings, alerts) {
	const ACP = {};

	ACP.init = function () {
		Settings.load('sso-telegram-oidc', $('.sso-telegram-oidc-settings'));

		$('#save').on('click', function () {
			Settings.save('sso-telegram-oidc', $('.sso-telegram-oidc-settings'), function () {
				alerts.alert({
					type: 'success',
					alert_id: 'sso-telegram-oidc-saved',
					title: 'Settings Saved',
					message: 'Please rebuild and restart your NodeBB to apply these settings, or click on this alert to reload.',
					clickfn: function () {
						socket.emit('admin.reload');
					},
				});
			});
		});
	};

	return ACP;
});
