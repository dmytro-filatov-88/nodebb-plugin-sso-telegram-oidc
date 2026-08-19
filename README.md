# NodeBB Telegram OIDC Single Sign-On (SSO) Plugin

`nodebb-plugin-sso-telegram-oidc` is a NodeBB plugin that allows users to log in or register on your forum using their Telegram account via the official **Telegram OpenID Connect (OIDC)** authentication flow.

This plugin is a modern replacement for legacy Telegram Login Widget configurations, offering easier integration, standard security practices (JWT and JWKS token verification), and a native OAuth2 workflow.

---

## Features

- **Standard OIDC Workflow:** Validates authentication tokens cryptographically against Telegram's official JWKS endpoint.
- **Auto-Association:** Automatically links a Telegram login to an existing forum user with the same verified email address.
- **Graceful Email Handling:** Allows generating a placeholder email (`username@telegram.local`) if the user's Telegram profile does not expose a public email address.
- **Admin Control Panel (ACP):** Easy configuration interface for API credentials, registration settings, and registration limits.
- **GDPR Compliant:** Handles user deletions and cleans up authentication mappings automatically.

---

## Installation

Run the following command in your NodeBB root directory to install the plugin:

```bash
npm install nodebb-plugin-sso-telegram-oidc
```

Alternatively, during development, you can link the plugin:

```bash
cd /path/to/nodebb-plugin-sso-telegram-oidc
npm link
cd /path/to/nodebb
npm link nodebb-plugin-sso-telegram-oidc
```

After installation:
1. Activate the plugin in your NodeBB ACP under the **Plugins > Manage** tab.
2. Rebuild and restart NodeBB:
   ```bash
   ./nodebb build
   ./nodebb restart
   ```

---

## Configuration

### 1. Register a Bot with Telegram
To use this plugin, you must configure your Telegram Bot to support OpenID Connect.

1. Open a chat with [@BotFather](https://t.me/botfather) in Telegram.
2. Select or create a bot using `/newbot` or `/mybots`.
3. Go to **Bot Settings > Login Settings** for your selected bot.
4. Select **Switch to OpenID Connect Login**.
5. Set your **Redirect URL** (Callback URL) to:
   ```text
   https://YOUR_FORUM_DOMAIN/auth/telegram-oidc/callback
   ```
   *Note: Telegram requires a secure `https://` callback URL for production.*
6. Save the settings. You will be provided with a **Client ID** and a **Client Secret**.

### 2. Configure the Plugin in NodeBB
1. Log in to your NodeBB Admin Control Panel.
2. Go to **Plugins > Social Authentication > Telegram OIDC**.
3. Input your **Client ID** and **Client Secret**.
4. Configure the settings:
   - **Skip email verification (Autoconfirm email addresses):** Automatically verifies email addresses returned by Telegram so users aren't flagged as unverified.
   - **Generate placeholder email if missing:** Generates an email address in the format `username@telegram.local` if Telegram does not provide an email, allowing registration to succeed.
   - **Disable SSO registration:** Prevents new registrations through Telegram (only allows existing forum users to link their Telegram profiles).
5. Click the floating **Save** button.
6. Rebuild and restart NodeBB as prompted, or run `./nodebb build && ./nodebb restart`.

---

## License

This project is licensed under the MIT License.
