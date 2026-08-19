<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
			<div class="alert alert-info">
				<strong>Quick Start</strong>
				<ol>
					<li>
						Create a new bot via <a href="https://t.me/botfather" target="_blank">@BotFather <i class="fa fa-external-link"></i></a> or edit an existing one.
					</li>
					<li>
						Go to your bot settings: <strong>Bot Settings > Login Settings</strong>.
					</li>
					<li>
						Click <strong>Switch to OpenID Connect Login</strong>.
					</li>
					<li>
						Add your callback URL:
						<ul>
							<li>The callback URL is: <code>{baseUrl}/auth/telegram-oidc/callback</code></li>
						</ul>
					</li>
					<li>
						Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> provided by BotFather.
					</li>
				</ol>
			</div>

			<form role="form" class="sso-telegram-oidc-settings">
				<div class="card mb-4">
					<div class="card-header">
						<strong>Telegram OIDC API Credentials</strong>
					</div>
					<div class="card-body">
						<div class="row">
							<div class="col-sm-6 col-xs-12">
								<div class="mb-3">
									<label class="form-label" for="id">Client ID</label>
									<input type="text" id="id" name="id" title="Client ID" class="form-control" placeholder="Client ID (e.g. your bot username or app ID)">
								</div>
							</div>
							<div class="col-sm-6 col-xs-12">
								<div class="mb-3">
									<label class="form-label" for="secret">Client Secret</label>
									<input type="password" id="secret" name="secret" title="Client Secret" class="form-control" placeholder="Client Secret">
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="card mb-4">
					<div class="card-header">
						<strong>SSO Behavior</strong>
					</div>
					<div class="card-body">
						<div class="form-check form-switch mb-3">
							<input class="form-check-input" type="checkbox" id="autoconfirm" name="autoconfirm" checked>
							<label class="form-check-label" for="autoconfirm">
								Skip email verification (Autoconfirm email addresses)
							</label>
							<div class="form-text">
								If enabled, users signing up through Telegram will be instantly verified and won't receive verification emails.
							</div>
						</div>

						<div class="form-check form-switch mb-3">
							<input class="form-check-input" type="checkbox" id="placeholderEmail" name="placeholderEmail" checked>
							<label class="form-check-label" for="placeholderEmail">
								Generate placeholder email if missing
							</label>
							<div class="form-text">
								If Telegram doesn't return an email address, generating a placeholder email (e.g., <code>username@telegram.local</code>) allows registrations to complete successfully. If disabled, NodeBB may block the registration or prompt for an email.
							</div>
						</div>

						<div class="form-check form-switch mb-3">
							<input class="form-check-input" type="checkbox" id="disableRegistration" name="disableRegistration">
							<label class="form-check-label" for="disableRegistration">
								Disable SSO registration
							</label>
							<div class="form-text">
								If enabled, only existing users can associate their accounts with Telegram OIDC. New registrations via Telegram will be blocked.
							</div>
						</div>
					</div>
				</div>
			</form>
		</div>
	</div>

	<!-- IMPORT admin/partials/settings/footer.tpl -->
</div>
