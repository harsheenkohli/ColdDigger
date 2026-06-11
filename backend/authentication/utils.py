# utils.py
import csv
import io
import chardet
from .models import CompanyContact

def process_csv_file(csv_file):
    """Process CSV file and store contacts in the database with encoding detection."""
    # Read the raw bytes from the file
    raw_data = csv_file.read()
    
    # Detect the file encoding
    result = chardet.detect(raw_data)
    encoding = result['encoding']
    
    try:
        # Try to decode the file with detected encoding
        decoded_file = raw_data.decode(encoding)
    except UnicodeDecodeError:
        # If that fails, try common encodings
        for enc in ['utf-8-sig', 'utf-16', 'iso-8859-1', 'cp1252']:
            try:
                decoded_file = raw_data.decode(enc)
                encoding = enc
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Unable to determine file encoding. Please ensure the file is properly encoded.")

    # Process the decoded content
    io_string = io.StringIO(decoded_file)
    reader = csv.DictReader(io_string)
    
    # Validate CSV headers
    required_fields = {'name', 'email', 'title', 'company'}
    headers = set(reader.fieldnames) if reader.fieldnames else set()
    
    if not required_fields.issubset(headers):
        missing_fields = required_fields - headers
        raise ValueError(f"Missing required fields in CSV: {', '.join(missing_fields)}")

    new_contacts = []
    existing_emails = set(CompanyContact.objects.values_list('email', flat=True))

    for row in reader:
        email = row['email'].strip()
        if not email or email in existing_emails:
            continue

        contact = CompanyContact(
            name=row['name'].strip(),
            email=email,
            title=row['title'].strip(),
            company=row['company'].strip()
        )
        new_contacts.append(contact)
        existing_emails.add(email)

    # Use bulk_create to efficiently insert new contacts
    if new_contacts:
        CompanyContact.objects.bulk_create(
            new_contacts,
            ignore_conflicts=True
        )

    return len(new_contacts)