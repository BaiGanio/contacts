using Contacts.Api.Contacts.ClearContacts;
using Contacts.Api.Contacts.CreateContact;
using Contacts.Api.Contacts.DeleteContact;
using Contacts.Api.Contacts.GetContact;
using Contacts.Api.Contacts.GetContacts;
using Contacts.Api.Contacts.GetImportFailures;
using Contacts.Api.Contacts.ImportContacts;
using Contacts.Api.Contacts.UpdateContact;
using FluentValidation;

namespace Contacts.Api.Contacts;

public static class ContactServiceCollectionExtensions
{
    public static IServiceCollection AddContactServices(this IServiceCollection services)
    {
        services.AddScoped<IValidator<CreateContactCommand>, CreateContactCommandValidator>();
        services.AddScoped<IValidator<UpdateContactRequest>, UpdateContactRequestValidator>();
        services.AddScoped<CreateContactHandler>();
        services.AddScoped<GetContactsHandler>();
        services.AddScoped<GetContactHandler>();
        services.AddScoped<UpdateContactHandler>();
        services.AddScoped<DeleteContactHandler>();
        services.AddScoped<ImportContactsHandler>();
        services.AddScoped<GetImportFailuresHandler>();
        services.AddScoped<ClearContactsHandler>();

        return services;
    }
}
