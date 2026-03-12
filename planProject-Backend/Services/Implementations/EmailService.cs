using MailKit.Net.Smtp;
using MimeKit;
using planProject.Services.Interfaces;

namespace planProject.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendWelcomeEmailAsync(string toEmail, string name, string password)
        {
            var settings = _config.GetSection("EmailSettings");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(settings["FromName"], settings["FromEmail"]));
            message.To.Add(new MailboxAddress(name, toEmail));
            message.Subject = "Bienvenue sur Axia Plan — Vos identifiants de connexion";

            message.Body = new TextPart("html")
            {
                Text = $@"
        <!DOCTYPE html>
        <html>
        <head><meta charset='utf-8'></head>
        <body style='margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>

        <table width='100%' cellpadding='0' cellspacing='0' style='background:#ffffff;padding:48px 24px;'>
            <tr><td align='center'>
            <table width='480' cellpadding='0' cellspacing='0' style='background:#ffffff;'>

                <!-- Logo / Titre -->
                <tr>
                <td style='padding-bottom:32px;border-bottom:2px solid #1d4ed8;'>
                    <span style='font-size:20px;font-weight:900;color:#1d4ed8;letter-spacing:-0.5px;'>Axia Plan</span>
                </td>
                </tr>

                <!-- Bonjour -->
                <tr>
                <td style='padding-top:32px;padding-bottom:16px;'>
                    <p style='margin:0;font-size:15px;color:#0f172a;line-height:1.8;'>
                    Bonjour <strong>{name}</strong>,
                    </p>
                </td>
                </tr>

                <!-- Message -->
                <tr>
                <td style='padding-bottom:28px;'>
                    <p style='margin:0;font-size:15px;color:#0f172a;line-height:1.8;'>
                    Bienvenue sur la plateforme <strong>Axia Plan</strong> !<br/>
                    Voici vos informations de connexion :
                    </p>
                </td>
                </tr>

                <!-- Infos connexion -->
                <tr>
                <td style='padding-bottom:28px;'>
                    <table width='100%' cellpadding='0' cellspacing='0'>
                    <tr>
                        <td style='padding:8px 0;border-bottom:1px solid #f1f5f9;'>
                        <span style='font-size:14px;color:#64748b;'>URL de la plateforme</span><br/>
                        <a href='http://localhost:5173/' style='font-size:14px;color:#1d4ed8;font-weight:600;text-decoration:none;'>
                            http://localhost:5173/
                        </a>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding:8px 0;border-bottom:1px solid #f1f5f9;'>
                        <span style='font-size:14px;color:#64748b;'>Email</span><br/>
                        <span style='font-size:14px;color:#0f172a;font-weight:600;font-family:monospace;'>{toEmail}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding:8px 0;'>
                        <span style='font-size:14px;color:#64748b;'>Mot de passe</span><br/>
                        <span style='font-size:14px;color:#0f172a;font-weight:600;font-family:monospace;'>{password}</span>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- Avertissement -->
                <tr>
                <td style='padding-bottom:36px;'>
                    <p style='margin:0;font-size:14px;color:#0f172a;line-height:1.8;'>
                    Veuillez vous connecter et <strong>changer votre mot de passe</strong> dès votre première connexion.
                    </p>
                </td>
                </tr>

                <!-- Séparateur -->
                <tr>
                <td style='border-top:1px solid #e2e8f0;padding-top:24px;'>
                    <p style='margin:0;font-size:14px;color:#0f172a;line-height:1.8;'>
                    Cordialement,<br/>
                    <strong>L'équipe Axia Plan</strong>
                    </p>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td style='padding-top:24px;'>
                    <p style='margin:0;font-size:11px;color:#94a3b8;line-height:1.6;'>
                    Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                </td>
                </tr>

            </table>
            </td></tr>
        </table>

        </body>
        </html>"
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(settings["Host"], int.Parse(settings["Port"]!), MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(settings["Username"], settings["Password"]);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }

        public async Task SendResetPasswordEmailAsync(string toEmail, string resetLink)
        {
            var settings = _config.GetSection("EmailSettings");

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                settings["FromName"], settings["FromEmail"]));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = "Réinitialisation de votre mot de passe — Axia Plan";

            message.Body = new TextPart("html")
            {
                Text = $@"
                <!DOCTYPE html>
                <html>
                <head><meta charset='utf-8'></head>
                <body style='margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>
                
                <!-- Wrapper -->
                <table width='100%' cellpadding='0' cellspacing='0' style='background:#f8fafc;padding:48px 24px;'>
                    <tr><td align='center'>
                    <table width='520' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;'>
                        
                        <!-- Header bleu -->
                        
                        <!-- Titre -->
                        <tr>
                        <td align='center' style='padding:20px 40px 8px;'>
                            <h1 style='margin:0;font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;'>
                            Réinitialisation du mot de passe
                            </h1>
                        </td>
                        </tr>

                        <!-- Message -->
                        <tr>
                        <td style='padding:8px 40px 28px;'>
                            <p style='margin:0;font-size:15px;color:#64748b;line-height:1.7;text-align:center;'>
                            Vous avez demandé à réinitialiser votre mot de passe.<br/>
                            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                            </p>
                        </td>
                        </tr>

                        <!-- Bouton -->
                        <tr>
                        <td align='center' style='padding:0 40px 36px;'>
                            <a href='{resetLink}'
                            style='display:inline-block;padding:14px 36px;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 14px rgba(29,78,216,0.35);letter-spacing:0.2px;'>
                            Réinitialiser mon mot de passe
                            </a>
                        </td>
                        </tr>

                        <!-- Séparateur -->
                        <tr>
                        <td style='padding:0 40px;'>
                            <div style='border-top:1px solid #f1f5f9;'></div>
                        </td>
                        </tr>

        

                        <!-- Avertissement -->
                        <tr>
                        <td style='padding:0 40px 16px;'>
                            
                            <tr>
                                <td style='padding:12px 16px;'>
                                <p style='margin:0;font-size:15px;color:#64748b;line-height:1.7;text-align:center;'>
                                    ⚠ Ce lien est valable une seule fois et expire dans 24 heures.
                                </p>
                                </td>
                            </tr>
                            
                        </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                        <td style='background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;'>
                            <p style='margin:0;font-size:11px;color:#94a3b8;line-height:1.6;'>
                            © 2026 Axia Plan — Plateforme interne de gestion des plans techniques<br/>
                            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                            </p>
                        </td>
                        </tr>

                    </table>
                    </td></tr>
                </table>

                </body>
                </html>"
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(
                settings["Host"],
                int.Parse(settings["Port"]!),
                MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(
                settings["Username"], settings["Password"]);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}