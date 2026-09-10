using Contacts.Api.Contacts;
using Contacts.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Contacts.Api.Data;

public sealed class ContactsDbContext(DbContextOptions<ContactsDbContext> options) : DbContext(options)
{
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<FailedImportRow> FailedImportRows => Set<FailedImportRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Lets a plain index store substrings of a column, not just whole values, so
        // ILIKE '%text%' searches (used by GetContactsHandler) can use an index
        // instead of scanning every row — a plain btree index can't help a search
        // with a leading wildcard.
        modelBuilder.HasPostgresExtension("pg_trgm");

        var ibanConverter = new ValueConverter<Iban, string>(
            iban => iban.Value,
            value => new Iban(value));

        modelBuilder.Entity<Contact>(contact =>
        {
            contact.ToTable("Contacts");
            contact.HasKey(value => value.Id);

            contact.Property(value => value.Id)
                .HasColumnName("Id")
                .ValueGeneratedNever();
            contact.Property(value => value.FirstName)
                .HasColumnName("FirstName")
                .IsRequired();
            contact.Property(value => value.Surname)
                .HasColumnName("Surname")
                .IsRequired();
            contact.Property(value => value.DateOfBirth)
                .HasColumnName("DateOfBirth")
                .IsRequired();
            contact.Property(value => value.Address)
                .HasColumnName("Address")
                .IsRequired();
            contact.Property(value => value.PhoneNumber)
                .HasColumnName("PhoneNumber")
                .IsRequired();
            contact.Property(value => value.Iban)
                .HasColumnName("Iban")
                .HasConversion(ibanConverter)
                .HasMaxLength(34)
                .IsRequired();
            contact.HasIndex(value => value.Iban).IsUnique();
            contact.HasIndex(value => value.FirstName).HasMethod("gin").HasOperators("gin_trgm_ops");
            contact.HasIndex(value => value.Surname).HasMethod("gin").HasOperators("gin_trgm_ops");
        });

        modelBuilder.Entity<FailedImportRow>(row =>
        {
            row.ToTable("FailedImportRows");
            row.HasKey(value => value.Id);

            row.Property(value => value.Id).ValueGeneratedNever();
            row.Property(value => value.RowHash).HasMaxLength(64).IsRequired();
            row.HasIndex(value => value.RowHash).IsUnique();
            row.Property(value => value.RawRow).IsRequired();
            row.Property(value => value.ErrorMessage).IsRequired();
        });
    }
}
