# LLM Floor Plan Generator - Frontend

This is the frontend for the LLM Floor Plan Generator, a React application that allows users to draw floor plan boundaries and input text descriptions to generate floor plans using LLM technology.

## Features

- Draw floor plan boundaries using tldraw canvas
- Input natural language descriptions for floor plan requirements
- Generate floor plans by sending data to the backend service
- Responsive UI for both desktop and mobile devices

## Tech Stack

- React
- tldraw for the drawing canvas
- Tailwind CSS for styling
- Vite for build tooling

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository (if not already done):
   ```
   git clone https://github.com/your-username/LLM-Floor-plan.git
   cd LLM-Floor-plan/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. The application will open in your browser at `http://localhost:3000`.

## Development

### Project Structure

- `src/components/`: React components (e.g., BoundaryCanvas, TextInput)
- `src/hooks/`: Custom React hooks
- `src/services/`: API service functions
- `src/styles/`: CSS stylesheets
- `public/`: Static assets

### Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run preview`: Preview the production build locally

## Integration with Backend

By default, the frontend will try to connect to a backend service at `http://localhost:3001/api`. You can modify this in the `src/services/llmService.js` file or set the `REACT_APP_API_URL` environment variable.

Currently, the backend integration is simulated, with mock data being returned. In a production setup, you would connect to the actual backend service.

## Customization

- Modify the Tailwind configuration in `tailwind.config.js`
- Update the styles in `src/styles/App.css` and `src/styles/index.css`
- Customize the example prompts in `src/components/TextInput.jsx`

## License

This project is open-source. See the LICENSE file for more information. 