# Streaming Chat Application

This project is a simple streaming chat application with a React frontend and a Python (Flask) backend. The backend streams words from an input string to the frontend at an interval of 500ms, simulating a real-time chat experience.

---

## Project Structure

```
workspace/
├── backend/
│   ├── app.py                # Flask backend code
│   ├── requirements.txt      # Python dependencies
├── frontend/
│   ├── public/               # Static files for React
│   ├── src/                  # React source code
│   ├── package.json          # Node.js dependencies
│   ├── README.md             # Frontend-specific README
├── README.md                 # Main project README
```

---

## Prerequisites

Before running the project, ensure you have the following installed:

1. **Python 3.x** (for the backend)
2. **Node.js** (for the frontend)
3. **pip** (Python package manager)
4. **npm** (Node.js package manager)

---

## Setup Instructions

### Backend (Python Flask)

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

   If you don’t have a `requirements.txt` file, create one with the following content:
   ```
   Flask==2.3.2
   ```

3. Start the Flask server:
   ```bash
   python main.py
   ```

   The backend will run on `http://localhost:8080`.

---

### Frontend (React)

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

   The frontend will run on `http://localhost:3000`.

---

## How It Works

1. **Frontend**:
   - The user types a message in the input field and clicks "Send."
   - The message is sent to the backend API as a query parameter.

2. **Backend**:
   - The backend splits the input string into words and streams them back to the frontend at an interval of 500ms.

3. **Streaming**:
   - The frontend displays the streamed words in real-time on the chat screen.

---

## API Endpoint

The backend exposes a single endpoint:

- **GET `/stream`**:
  - **Query Parameter**: `input` (the string to stream)
  - **Response**: Streams words from the input string at 500ms intervals.

Example:
```
GET http://localhost:8080/stream?input=This%20is%20a%20test
```

Response:
```
This 
is 
a 
test 
```

---

## Example Usage

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm start
   ```

3. Open the React app in your browser (`http://localhost:3000`).

4. Type a message (e.g., "Hello world") and click "Send."

5. The app will display the user message and stream the response from the backend.
---

## Troubleshooting

1. **Backend Not Running**:
   - Ensure the Flask server is running on `http://localhost:8080`.
   - Check the terminal for any errors.

2. **CORS Issues**:
   - Ensure the backend has CORS enabled (already implemented in the code).

3. **Frontend Not Connecting to Backend**:
   - Verify the API endpoint in the React app matches the backend URL.
   - Check the browser console for errors.
