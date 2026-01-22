import PyPDF2
import sys


def extract_pdf_text(pdf_path, output_path):
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""

            print(f"Total pages: {len(reader.pages)}")

            for i, page in enumerate(reader.pages):
                text += f"\n\n=== PAGE {i+1} ===\n\n"
                page_text = page.extract_text()
                text += page_text
                print(f"Extracted page {i+1}/{len(reader.pages)}")

            # Save to file
            with open(output_path, "w", encoding="utf-8") as out_file:
                out_file.write(text)

            print(f"\nExtraction complete! Saved to: {output_path}")
            return text
    except Exception as e:
        return f"Error: {str(e)}"


if __name__ == "__main__":
    pdf_path = r"d:\Pushti\0. Secondary Software Requirement Specification(SRS).pdf"
    output_path = r"c:\tkg\pusti-ht-mern\SECONDARY_SRS_EXTRACTED.md"
    content = extract_pdf_text(pdf_path, output_path)
    print(f"\n\nFirst 2000 characters:\n{content[:2000]}")
