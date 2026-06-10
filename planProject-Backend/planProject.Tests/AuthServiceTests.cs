using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using planProject.Data;
using planProject.Services;
using planProject.Services.Interfaces;

namespace planProject.Tests
{
    /// <summary>
    /// Tests unitaires pour AuthService.
    /// Dépendances mockées : JwtService, IEmailService, IAuditService.
    /// Base de données : InMemory (Microsoft.EntityFrameworkCore.InMemory).
    /// </summary>
    public class AuthServiceTests : IDisposable
    {
        // ── Infrastructure partagée ──────────────────────────────────────────
        private readonly ApplicationDbContext _db;
        private readonly Mock<JwtService>     _jwtMock;
        private readonly Mock<IEmailService>  _emailMock;
        private readonly Mock<IAuditService>  _auditMock;
        private readonly AuthService          _sut; // System Under Test

        public AuthServiceTests()
        {
            // Base de données InMemory isolée par test
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _db = new ApplicationDbContext(options);

            // Seed : rôle par défaut requis par RegisterAsync
            _db.Roles.Add(new Role { Id = 1, Name = "Chef" });
            _db.SaveChanges();

            // Mocks
            _jwtMock   = new Mock<JwtService>(MockBehavior.Loose,
                             new Mock<IConfiguration>().Object,
                             new Mock<IPermissionService>().Object);
            _emailMock = new Mock<IEmailService>();
            _auditMock = new Mock<IAuditService>();

            // SUT
            _sut = new AuthService(_db, _jwtMock.Object, _emailMock.Object, _auditMock.Object);
        }

        public void Dispose() => _db.Dispose();

        // ════════════════════════════════════════════════════════════════════
        // 1. RegisterAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        [Trait("Méthode", "RegisterAsync")]
        public async Task RegisterAsync_NouvelUtilisateur_RetourneSuccess()
        {
            // Arrange
            var dto = new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            };

            // Act
            var result = await _sut.RegisterAsync(dto);

            // Assert
            Assert.Equal("User registered successfully", result);
        }

        [Fact]
        [Trait("Méthode", "RegisterAsync")]
        public async Task RegisterAsync_NouvelUtilisateur_MotDePasseEstHache()
        {
            // Arrange
            var dto = new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            };

            // Act
            await _sut.RegisterAsync(dto);

            // Assert : le mot de passe stocké ne doit jamais être en clair
            var user = await _db.Users.FirstAsync(u => u.Email == dto.Email);
            Assert.NotEqual(dto.Password, user.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash));
        }

        [Fact]
        [Trait("Méthode", "RegisterAsync")]
        public async Task RegisterAsync_EmailDejaExistant_RetourneErreur()
        {
            // Arrange : premier enregistrement
            var dto = new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            };
            await _sut.RegisterAsync(dto);

            // Act : deuxième tentative avec le même email
            var result = await _sut.RegisterAsync(dto);

            // Assert
            Assert.Equal("Email already exists", result);
        }

        [Fact]
        [Trait("Méthode", "RegisterAsync")]
        public async Task RegisterAsync_RoleInexistant_RetourneErreur()
        {
            // Arrange
            var dto = new RegisterDto
            {
                Name     = "Bob",
                Email    = "bob@test.com",
                Password = "Password123!",
                Role     = "RoleInexistant"
            };

            // Act
            var result = await _sut.RegisterAsync(dto);

            // Assert
            Assert.Equal("Invalid role", result);
        }

        [Fact]
        [Trait("Méthode", "RegisterAsync")]
        public async Task RegisterAsync_NouvelUtilisateur_AuditLogEstGenere()
        {
            // Arrange
            var dto = new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            };

            // Act
            await _sut.RegisterAsync(dto);

            // Assert : IAuditService.LogAsync doit être appelé une fois
            _auditMock.Verify(a => a.LogAsync(
                It.IsAny<int>(),
                It.IsAny<string>(),
                "User",
                It.IsAny<int>(),
                It.IsAny<string>()
            ), Times.Once);
        }

        // ════════════════════════════════════════════════════════════════════
        // 2. LoginAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        [Trait("Méthode", "LoginAsync")]
        public async Task LoginAsync_IdentifiantsValides_RetourneToken()
        {
            // Arrange : créer un utilisateur en base
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            });

            _jwtMock
                .Setup(j => j.GenerateToken(It.IsAny<User>()))
                .ReturnsAsync("fake.jwt.token");

            var dto = new LoginDto { Email = "alice@test.com", Password = "Password123!" };

            // Act
            var result = await _sut.LoginAsync(dto);

            // Assert
            Assert.Equal("fake.jwt.token", result);
        }

        [Fact]
        [Trait("Méthode", "LoginAsync")]
        public async Task LoginAsync_EmailInexistant_RetourneInvalidCredentials()
        {
            // Arrange
            var dto = new LoginDto { Email = "inconnu@test.com", Password = "Password123!" };

            // Act
            var result = await _sut.LoginAsync(dto);

            // Assert
            Assert.Equal("Invalid credentials", result);
        }

        [Fact]
        [Trait("Méthode", "LoginAsync")]
        public async Task LoginAsync_MotDePasseIncorrect_RetourneInvalidCredentials()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            });

            var dto = new LoginDto { Email = "alice@test.com", Password = "MauvaisMotDePasse!" };

            // Act
            var result = await _sut.LoginAsync(dto);

            // Assert
            Assert.Equal("Invalid credentials", result);
        }

        [Fact]
        [Trait("Méthode", "LoginAsync")]
        public async Task LoginAsync_IdentifiantsValides_AuditLogEstGenere()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            });

            _jwtMock
                .Setup(j => j.GenerateToken(It.IsAny<User>()))
                .ReturnsAsync("fake.jwt.token");

            var dto = new LoginDto { Email = "alice@test.com", Password = "Password123!" };

            // Act
            await _sut.LoginAsync(dto);

            // Assert : LOGIN audit log doit être créé
            _auditMock.Verify(a => a.LogAsync(
                It.IsAny<int>(),
                "LOGIN",
                "Auth",
                It.IsAny<int>(),
                It.IsAny<string>()
            ), Times.Once);
        }

        [Fact]
        [Trait("Méthode", "LoginAsync")]
        public async Task LoginAsync_IdentifiantsInvalides_JwtNestPasGenere()
        {
            // Arrange
            var dto = new LoginDto { Email = "inconnu@test.com", Password = "Password123!" };

            // Act
            await _sut.LoginAsync(dto);

            // Assert : GenerateToken ne doit pas être appelé
            _jwtMock.Verify(j => j.GenerateToken(It.IsAny<User>()), Times.Never);
        }

        // ════════════════════════════════════════════════════════════════════
        // 3. ChangePasswordAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        [Trait("Méthode", "ChangePasswordAsync")]
        public async Task ChangePasswordAsync_AncienMotDePasseCorrect_RetourneSuccess()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "OldPassword123!",
                Role     = "Chef"
            });
            var user = await _db.Users.FirstAsync(u => u.Email == "alice@test.com");

            var dto = new ChangePasswordDto
            {
                CurrentPassword = "OldPassword123!",
                NewPassword     = "NewPassword456!"
            };

            // Act
            var result = await _sut.ChangePasswordAsync(user.Id, dto);

            // Assert
            Assert.Equal("Password changed successfully", result);
        }

        [Fact]
        [Trait("Méthode", "ChangePasswordAsync")]
        public async Task ChangePasswordAsync_NouveauMotDePasseEstBienHache()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "OldPassword123!",
                Role     = "Chef"
            });
            var user = await _db.Users.FirstAsync(u => u.Email == "alice@test.com");

            var dto = new ChangePasswordDto
            {
                CurrentPassword = "OldPassword123!",
                NewPassword     = "NewPassword456!"
            };

            // Act
            await _sut.ChangePasswordAsync(user.Id, dto);

            // Assert
            var updated = await _db.Users.FindAsync(user.Id);
            Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword456!", updated!.PasswordHash));
        }

        [Fact]
        [Trait("Méthode", "ChangePasswordAsync")]
        public async Task ChangePasswordAsync_AncienMotDePasseIncorrect_RetourneErreur()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "OldPassword123!",
                Role     = "Chef"
            });
            var user = await _db.Users.FirstAsync(u => u.Email == "alice@test.com");

            var dto = new ChangePasswordDto
            {
                CurrentPassword = "MauvaisAncienMdp!",
                NewPassword     = "NewPassword456!"
            };

            // Act
            var result = await _sut.ChangePasswordAsync(user.Id, dto);

            // Assert
            Assert.Equal("Current password is incorrect", result);
        }

        [Fact]
        [Trait("Méthode", "ChangePasswordAsync")]
        public async Task ChangePasswordAsync_UtilisateurInexistant_RetourneErreur()
        {
            // Arrange
            var dto = new ChangePasswordDto
            {
                CurrentPassword = "OldPassword123!",
                NewPassword     = "NewPassword456!"
            };

            // Act
            var result = await _sut.ChangePasswordAsync(9999, dto);

            // Assert
            Assert.Equal("User not found", result);
        }

        // ════════════════════════════════════════════════════════════════════
        // 4. ForgotPasswordAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        [Trait("Méthode", "ForgotPasswordAsync")]
        public async Task ForgotPasswordAsync_EmailExistant_EnvoieEmailEtRetourneSuccess()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "Password123!",
                Role     = "Chef"
            });

            _jwtMock
                .Setup(j => j.GenerateResetToken(It.IsAny<User>()))
                .Returns("reset.token.fake");

            _emailMock
                .Setup(e => e.SendResetPasswordEmailAsync(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            // Act
            var result = await _sut.ForgotPasswordAsync("alice@test.com");

            // Assert
            Assert.Equal("Reset password email sent", result);
            _emailMock.Verify(e => e.SendResetPasswordEmailAsync(
                "alice@test.com",
                It.IsAny<string>()
            ), Times.Once);
        }

        [Fact]
        [Trait("Méthode", "ForgotPasswordAsync")]
        public async Task ForgotPasswordAsync_EmailInexistant_RetourneErreur()
        {
            // Act
            var result = await _sut.ForgotPasswordAsync("inconnu@test.com");

            // Assert
            Assert.Equal("User not found", result);
        }

        // ════════════════════════════════════════════════════════════════════
        // 5. ResetPasswordAsync
        // ════════════════════════════════════════════════════════════════════

        [Fact]
        [Trait("Méthode", "ResetPasswordAsync")]
        public async Task ResetPasswordAsync_TokenValide_RetourneSuccess()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "OldPassword123!",
                Role     = "Chef"
            });
            var user = await _db.Users.FirstAsync(u => u.Email == "alice@test.com");

            _jwtMock
                .Setup(j => j.ValidateResetToken("valid.reset.token"))
                .Returns(user.Id);

            // Act
            var result = await _sut.ResetPasswordAsync("valid.reset.token", "NewPassword456!");

            // Assert
            Assert.Equal("Password has been reset successfully", result);
        }

        [Fact]
        [Trait("Méthode", "ResetPasswordAsync")]
        public async Task ResetPasswordAsync_TokenValide_NouveauMotDePasseEstHache()
        {
            // Arrange
            await _sut.RegisterAsync(new RegisterDto
            {
                Name     = "Alice",
                Email    = "alice@test.com",
                Password = "OldPassword123!",
                Role     = "Chef"
            });
            var user = await _db.Users.FirstAsync(u => u.Email == "alice@test.com");

            _jwtMock
                .Setup(j => j.ValidateResetToken("valid.reset.token"))
                .Returns(user.Id);

            // Act
            await _sut.ResetPasswordAsync("valid.reset.token", "NewPassword456!");

            // Assert
            var updated = await _db.Users.FindAsync(user.Id);
            Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword456!", updated!.PasswordHash));
        }

        [Fact]
        [Trait("Méthode", "ResetPasswordAsync")]
        public async Task ResetPasswordAsync_TokenInvalide_RetourneErreur()
        {
            // Arrange
            _jwtMock
                .Setup(j => j.ValidateResetToken("invalid.token"))
                .Returns((int?)null);

            // Act
            var result = await _sut.ResetPasswordAsync("invalid.token", "NewPassword456!");

            // Assert
            Assert.Equal("Invalid or expired token", result);
        }
    }
}