from flask import Flask, Response, request, jsonify
import time

app = Flask(__name__)

# Enable CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response

# Stream handler
@app.route('/stream', methods=['GET'])
def stream_handler():
    # Get the input string from query parameter
    input_str = request.args.get('input')
    if not input_str:
        return jsonify({"error": "Missing 'input' query parameter"}), 400

    # Split the input string into words
    words = input_str.split()
    if not words:
        return jsonify({"error": "Input string contains no words"}), 400

    # Stream response generator
    def generate():
        for word in words:
            yield word + "  "  # Add a space after each word
            time.sleep(0.5)  # Wait for 500 milliseconds

    # Return the streaming response
    return Response(generate(), content_type='text/plain')

# Main entry point
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)