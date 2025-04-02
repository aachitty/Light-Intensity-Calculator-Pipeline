import PyPDF2

def extract_text_from_pdf(pdf_path):
    text = ""
    with open(pdf_path, "rb") as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text()
    return text

if __name__ == "__main__":
    pdf_path = "attached_assets/s60 photometric data.pdf"
    text = extract_text_from_pdf(pdf_path)
    print(text[:2000])  # Print first 2000 characters