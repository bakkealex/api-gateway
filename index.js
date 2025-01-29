import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const port = process.env.PORT || 4000;

// Object containing configuration for each service
const services = {
  auth: { port: 3000 },
  data: { port: 3001 },
  products: { port: 3002 },
};

// Function to forward requests to the respective microservice
const forwardRequest = async (req, res, serviceName) => {
  const service = services[serviceName]; // Get the service configuration
  if (!service) {
    res.status(404).send("Service not found");
    return;
  }

  // Modify the original URL to remove the service name part
  const path = req.originalUrl.replace(`/${serviceName}`, "");

  // Construct the full URL for the microservice
  const url = `http://localhost:${service.port}${path}`;
  // Set up the options for the fetch request, including method, headers, and body
  const options = {
    method: req.method,
    headers: { ...req.headers, host: `localhost:${service.port}` }, // Adjust the host header
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify(req.body)
        : null,
  };

  try {
    console.log("Forwarding to", url);
    const response = await fetch(url, options); // Perform the request to the microservice

    // Forward the response from the microservice to the original client
    res.status(response.status);
    response.headers.get("content-type")?.includes("application/json")
      ? res.json(await response.json())
      : res.send(await response.text());
  } catch (error) {
    console.error("Error forwarding request:", error);
    res.status(500).json({ error: error.message });
  }
};

// Set up dynamic routing for each service
Object.keys(services).forEach((serviceName) => {
  app.use(`/${serviceName}`, (req, res) =>
    forwardRequest(req, res, serviceName)
  );
});

// Simple ping endpoint for health check
app.get("/ping", (req, res) => res.send("pong"));

app.listen(port, () => {
  console.log(`API Gateway running at http://localhost:${port}/`);
});
