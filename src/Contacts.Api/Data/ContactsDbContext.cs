using Contacts.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Contacts.Api.Data;

public sealed class ContactsDbContext(DbContextOptions<ContactsDbContext> options) : DbContext(options)
{
    public DbSet<Contact> Contacts => Set<Contact>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
        });
    }
}
