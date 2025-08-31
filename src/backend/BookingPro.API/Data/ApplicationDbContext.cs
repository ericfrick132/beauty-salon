using Microsoft.EntityFrameworkCore;
using BookingPro.API.Models.Entities;
using BookingPro.API.Models.Interfaces;

namespace BookingPro.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options, 
            IHttpContextAccessor? httpContextAccessor = null) : base(options)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        // DbSets para tablas compartidas (public schema)
        public DbSet<Vertical> Verticals { get; set; }
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Plan> Plans { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<Invitation> Invitations { get; set; }

        // DbSets para entidades por tenant
        public DbSet<Models.Entities.ServiceCategory> ServiceCategories { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Schedule> Schedules { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<DailyReport> DailyReports { get; set; }
        public DbSet<BookingStatusHistory> BookingStatusHistory { get; set; }
        public DbSet<PaymentConfiguration> PaymentConfigurations { get; set; }
        public DbSet<PaymentTransaction> PaymentTransactions { get; set; }
        public DbSet<MercadoPagoConfiguration> MercadoPagoConfigurations { get; set; }
        public DbSet<SubscriptionPayment> SubscriptionPayments { get; set; }
        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        
        // Platform entities (B2B)
        public DbSet<PlatformMercadoPagoConfiguration> PlatformMercadoPagoConfigurations { get; set; }
        public DbSet<TenantSubscriptionPayment> TenantSubscriptionPayments { get; set; }
        
        // End User entities (B2C)
        public DbSet<EndUser> EndUsers { get; set; }
        public DbSet<TenantPlan> TenantPlans { get; set; }
        public DbSet<Membership> Memberships { get; set; }
        public DbSet<EndUserPayment> EndUserPayments { get; set; }
        
        // OAuth entities
        public DbSet<MercadoPagoOAuthState> MercadoPagoOAuthStates { get; set; }
        public DbSet<MercadoPagoOAuthConfiguration> MercadoPagoOAuthConfigurations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuraciones de entidades maestras
            ConfigureMasterEntities(modelBuilder);
            
            // Configuraciones de entidades por tenant
            ConfigureTenantEntities(modelBuilder);
            
            // Aplicar filtros globales de multi-tenant
            ConfigureMultiTenantFilters(modelBuilder);
        }

        private void ConfigureMasterEntities(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Vertical>(entity =>
            {
                entity.HasIndex(v => v.Code).IsUnique();
                entity.HasIndex(v => v.Domain).IsUnique();
            });

            modelBuilder.Entity<Tenant>(entity =>
            {
                entity.HasIndex(t => new { t.Subdomain, t.VerticalId }).IsUnique();
                entity.HasIndex(t => t.SchemaName).IsUnique();
                entity.HasIndex(t => t.CustomDomain).IsUnique();

                entity.HasOne(t => t.Vertical)
                    .WithMany(v => v.Tenants)
                    .HasForeignKey(t => t.VerticalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.Plan)
                    .WithMany(p => p.Tenants)
                    .HasForeignKey(t => t.PlanId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<Plan>(entity =>
            {
                entity.HasOne(p => p.Vertical)
                    .WithMany(v => v.Plans)
                    .HasForeignKey(p => p.VerticalId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => new { u.Email, u.TenantId }).IsUnique();

                entity.HasOne(u => u.Tenant)
                    .WithMany(t => t.Users)
                    .HasForeignKey(u => u.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Subscription>(entity =>
            {
                entity.HasOne(s => s.Tenant)
                    .WithMany(t => t.Subscriptions)
                    .HasForeignKey(s => s.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Invitation>(entity =>
            {
                entity.HasIndex(i => i.Token).IsUnique();
                entity.HasIndex(i => new { i.Subdomain, i.VerticalId }).IsUnique();
                entity.HasIndex(i => i.Status);
                entity.HasIndex(i => i.ExpiresAt);

                entity.HasOne(i => i.Vertical)
                    .WithMany()
                    .HasForeignKey(i => i.VerticalId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(i => i.Plan)
                    .WithMany()
                    .HasForeignKey(i => i.PlanId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(i => i.CreatedTenant)
                    .WithMany()
                    .HasForeignKey(i => i.CreatedTenantId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // === Platform Entities Configuration (B2B) ===
            modelBuilder.Entity<PlatformMercadoPagoConfiguration>(entity =>
            {
                entity.HasIndex(p => p.IsActive);
                entity.HasIndex(p => p.IsSandbox);
            });

            modelBuilder.Entity<TenantSubscriptionPayment>(entity =>
            {
                entity.HasIndex(p => p.TenantId);
                entity.HasIndex(p => p.Status);
                entity.HasIndex(p => p.PeriodEnd);
                entity.HasIndex(p => p.PlatformPaymentId);

                entity.HasOne(p => p.Tenant)
                    .WithMany()
                    .HasForeignKey(p => p.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        private void ConfigureTenantEntities(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Models.Entities.ServiceCategory>(entity =>
            {
                entity.ToTable("service_categories");
                entity.HasIndex(sc => sc.Name);
                entity.HasIndex(sc => sc.TenantId);
            });

            modelBuilder.Entity<Service>(entity =>
            {
                entity.ToTable("services");
                entity.HasIndex(s => s.Name);
                entity.HasIndex(s => s.IsActive);
                entity.HasIndex(s => s.TenantId);

                entity.HasOne(s => s.Category)
                    .WithMany(sc => sc.Services)
                    .HasForeignKey(s => s.CategoryId)
                    .OnDelete(DeleteBehavior.SetNull);

                // Combinar filtros: tenant + soft delete
                entity.HasQueryFilter(s => s.TenantId == GetCurrentTenantId() && s.IsActive);
            });


            modelBuilder.Entity<Customer>(entity =>
            {
                entity.ToTable("customers");
                // Email should be unique per tenant, not globally
                entity.HasIndex(c => new { c.Email, c.TenantId }).IsUnique();
                // Phone should be unique per tenant, not globally
                entity.HasIndex(c => new { c.Phone, c.TenantId }).IsUnique();
                entity.HasIndex(c => c.TenantId);
            });

            modelBuilder.Entity<Booking>(entity =>
            {
                entity.ToTable("bookings");
                entity.HasIndex(b => b.StartTime);
                entity.HasIndex(b => b.EmployeeId);
                entity.HasIndex(b => b.CustomerId);
                entity.HasIndex(b => b.Status);
                entity.HasIndex(b => b.TenantId);

                entity.HasOne(b => b.Customer)
                    .WithMany(c => c.Bookings)
                    .HasForeignKey(b => b.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.Employee)
                    .WithMany(p => p.Bookings)
                    .HasForeignKey(b => b.EmployeeId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(b => b.Service)
                    .WithMany(s => s.Bookings)
                    .HasForeignKey(b => b.ServiceId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BookingStatusHistory>(entity =>
            {
                entity.ToTable("booking_status_history");
                entity.HasIndex(bsh => bsh.BookingId);
                entity.HasIndex(bsh => bsh.ChangedAt);
                entity.HasIndex(bsh => bsh.TenantId);

                entity.HasOne(bsh => bsh.Booking)
                    .WithMany()
                    .HasForeignKey(bsh => bsh.BookingId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.ToTable("payments");
                entity.HasIndex(p => p.BookingId);
                entity.HasIndex(p => p.TenantId);
                entity.HasIndex(p => p.Status);
                
                // Configure relationships
                entity.HasOne(p => p.Booking)
                    .WithMany(b => b.Payments)
                    .HasForeignKey(p => p.BookingId)
                    .OnDelete(DeleteBehavior.Restrict);
                    
                entity.HasOne(p => p.Customer)
                    .WithMany(c => c.Payments)
                    .HasForeignKey(p => p.CustomerId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                entity.HasOne(p => p.Employee)
                    .WithMany(e => e.Payments)
                    .HasForeignKey(p => p.EmployeeId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
            
            modelBuilder.Entity<MercadoPagoConfiguration>(entity =>
            {
                entity.ToTable("mercadopago_configurations");
                entity.HasIndex(m => m.TenantId).IsUnique();
                
                entity.HasOne(m => m.Tenant)
                    .WithOne()
                    .HasForeignKey<MercadoPagoConfiguration>(m => m.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // === New End User Entities Configuration ===
            modelBuilder.Entity<EndUser>(entity =>
            {
                entity.ToTable("end_users");
                entity.HasIndex(e => new { e.Email, e.TenantId }).IsUnique();
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.DemoEndsAt);
                entity.HasIndex(e => e.MembershipEndsAt);
                entity.HasIndex(e => e.TenantId);
            });

            modelBuilder.Entity<TenantPlan>(entity =>
            {
                entity.ToTable("tenant_plans");
                entity.HasIndex(p => new { p.Code, p.TenantId }).IsUnique();
                entity.HasIndex(p => p.IsActive);
                entity.HasIndex(p => p.TenantId);
                entity.HasIndex(p => p.DisplayOrder);
            });

            modelBuilder.Entity<Membership>(entity =>
            {
                entity.ToTable("memberships");
                entity.HasIndex(m => m.EndUserId);
                entity.HasIndex(m => m.Status);
                entity.HasIndex(m => m.EndDate);
                entity.HasIndex(m => m.TenantId);

                entity.HasOne(m => m.EndUser)
                    .WithMany(u => u.Memberships)
                    .HasForeignKey(m => m.EndUserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(m => m.Plan)
                    .WithMany(p => p.Memberships)
                    .HasForeignKey(m => m.PlanId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<EndUserPayment>(entity =>
            {
                entity.ToTable("end_user_payments");
                entity.HasIndex(p => p.EndUserId);
                entity.HasIndex(p => p.Status);
                entity.HasIndex(p => p.MercadoPagoPaymentId);
                entity.HasIndex(p => p.ExternalReference);
                entity.HasIndex(p => p.TenantId);

                entity.HasOne(p => p.EndUser)
                    .WithMany(u => u.Payments)
                    .HasForeignKey(p => p.EndUserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(p => p.Plan)
                    .WithMany()
                    .HasForeignKey(p => p.PlanId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Membership)
                    .WithMany(m => m.Payments)
                    .HasForeignKey(p => p.MembershipId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // === OAuth Entities Configuration ===
            modelBuilder.Entity<MercadoPagoOAuthState>(entity =>
            {
                entity.ToTable("mercadopago_oauth_states");
                entity.HasIndex(s => s.State).IsUnique();
                entity.HasIndex(s => s.TenantId);
                entity.HasIndex(s => s.ExpiresAt);
                entity.HasIndex(s => s.IsCompleted);
            });

            modelBuilder.Entity<MercadoPagoOAuthConfiguration>(entity =>
            {
                entity.ToTable("mercadopago_oauth_configurations");
                entity.HasIndex(c => c.TenantId);
                entity.HasIndex(c => c.MercadoPagoUserId);
                entity.HasIndex(c => c.IsActive);
                entity.HasIndex(c => c.AccessTokenExpiresAt);
            });
        }

        private void ConfigureMultiTenantFilters(ModelBuilder modelBuilder)
        {
            // Aplicar filtros globales a todas las entidades que implementan ITenantEntity
            // Esto filtrará automáticamente los datos por tenant en todas las consultas
            
            modelBuilder.Entity<Models.Entities.ServiceCategory>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Customer>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Booking>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<BookingStatusHistory>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Employee>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Payment>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<DailyReport>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Schedule>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<MercadoPagoConfiguration>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            
            // New End User entities filters
            modelBuilder.Entity<EndUser>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<TenantPlan>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<Membership>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<EndUserPayment>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            
            // OAuth entities filters
            modelBuilder.Entity<MercadoPagoOAuthState>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            modelBuilder.Entity<MercadoPagoOAuthConfiguration>().HasQueryFilter(e => e.TenantId == GetCurrentTenantId());
            
            // Nota: Service ya tiene su filtro combinado en ConfigureTenantEntities
        }

        private Guid GetCurrentTenantId()
        {
            // Usar HttpContextAccessor para obtener el TenantId
            if (_httpContextAccessor?.HttpContext?.Items.ContainsKey("TenantId") == true)
            {
                if (Guid.TryParse(_httpContextAccessor.HttpContext.Items["TenantId"]?.ToString(), out Guid tenantId))
                {
                    return tenantId;
                }
            }
            
            // Durante migraciones o seeding, no hay tenant
            return Guid.Empty;
        }
        
        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var tenantId = GetCurrentTenantId();
            
            // Asignar TenantId a nuevas entidades
            foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
            {
                if (entry.State == EntityState.Added && tenantId != Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId;
                }
            }
            
            return await base.SaveChangesAsync(cancellationToken);
        }
        
        public override int SaveChanges()
        {
            var tenantId = GetCurrentTenantId();
            
            // Asignar TenantId a nuevas entidades
            foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
            {
                if (entry.State == EntityState.Added && tenantId != Guid.Empty)
                {
                    entry.Entity.TenantId = tenantId;
                }
            }
            
            return base.SaveChanges();
        }
    }
}