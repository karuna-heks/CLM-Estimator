# Graph Editor

An interactive graph editor for creating nodes, assigning properties, inserting images, and calculating workload estimates.

## ✨ Features
- Create and edit graph nodes
- Add images via `Ctrl+V` or file upload
- Add comments to edges
- Project estimation with:
    - "New Development" table
    - "Adaptation" table
    - "Uploading" table
- Save and load graph structure as `.json`
- Export the entire graph as a PNG (including nodes, edges, and labels)

## 🚀 Run with Docker

1. Build the project:
    `npm run build`
2. Build the Docker image:
    `docker build -t graph-editor .`
3. Run the container:
    `docker run -p 5173:80 graph-editor`
4. Open in your browser:
    [http://localhost:5173/](http://localhost:5173/)
## 📁 Project Structure
- GraphEditor.tsx – main editor logic
- components/ui/ – reusable UI components
- public/ – entry HTML and static assets
