from flask import Flask, request, jsonify, render_template
import openai
import os
import fitz  # PyMuPDF to extract text from PDFs
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
openai.api_key = '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'

app = Flask(__name__)

# Route to serve the HTML frontend
@app.route('/')
def index():
    return render_template('ind.html')

# Function to extract text from PDF
def extract_text_from_pdf(pdf_file):
    text = ""
    with fitz.open(stream=pdf_file.read(), filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

# Split text into chunks (for embedding and question-answering)
def split_text_into_chunks(text, chunk_size=1000):
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

# Generate embeddings using OpenAI's API
def get_embeddings(text_chunks):
    response = openai.Embedding.create(
        input=text_chunks,
        model="text-embedding-ada-002"
    )
    embeddings = [np.array(data['embedding']) for data in response['data']]
    return embeddings

# Upload PDF, extract text, and generate embeddings
@app.route('/upload_pdf', methods=['POST'])
def upload_pdf():
    pdf_file = request.files['pdf_file']

    if not pdf_file:
        return jsonify({"error": "No file uploaded"}), 400

    # Step 1: Extract text from the PDF
    extracted_text = extract_text_from_pdf(pdf_file)

    # Step 2: Split text into chunks
    text_chunks = split_text_into_chunks(extracted_text)

    # Step 3: Generate embeddings for each chunk
    embeddings = get_embeddings(text_chunks)

    # Return extracted text and embeddings
    return jsonify({
        "text_chunks": text_chunks,
        "message": "PDF processed and embeddings generated."
    })


@app.route('/log_search_term', methods=['POST'])
def log_search_term():
    data = request.json
    search_term = data.get('searchTerm')
    print("Received Search Term:", search_term)  # This will print in your terminal
    return jsonify({"message": "Search term logged successfully."})


# Ask question based on the uploaded PDF content
@app.route('/ask_question', methods=['POST'])
def ask_question():
    data = request.json
    text_chunks = data.get('text_chunks', [])
    question = data.get('question', '')

    if not text_chunks or not question:
        return jsonify({"error": "Text chunks and question are required"}), 400

    # Call OpenAI's GPT-4 API to answer the question using context from the chunks
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": f"Given the following context:\n\n{text_chunks[:2]}\n\nAnswer the question: {question} and give the exact reference of the context from where the question was answered in a separate message."
            }
        ],
        max_tokens=200
    )

    answer = response['choices'][0]['message']['content'].strip()

    return jsonify({"answer": answer})

# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
