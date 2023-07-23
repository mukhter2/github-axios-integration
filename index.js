const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");
require("dotenv").config() // Load environment variables from .env file
const app = express();
const port = 3000;
app.use(
    session({
      secret: "1234#",
      resave: false,
      saveUninitialized: true,
    })
  );
app.get("/", (req, res) => {
    req.session.redirectToUser = req.query.redirectToUser;
    const { redirectToUser } = req.session;
    res.redirect(
            `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}`
          );
          return;
});
app.get("/oauth/redirect", async (req, res) => {
  const { code } = req.query;

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    const { access_token } = response.data;
    req.session.accessToken = access_token;
    res.sendFile(path.join(__dirname, "index.html"));          
  } catch (error) {
    console.error("Error exchanging code for access token:", error);
    res.status(500).send("Error occurred during authentication");
  }
});
app.get("/user", async (req, res) => {
    try {
      const { accessToken } = req.session;
      if (!accessToken) {
        res.status(401).send("Access token not found");
        return;
      }
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      const userData = userResponse.data;
  
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).send("Error occurred while fetching user data");
    }
  });

  app.get("/repos", async (req, res) => {
    try {
      const { accessToken } = req.session;
  
      const response = await axios.get("https://api.github.com/user/repos", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      const repositories = response.data;
      console.log("User Repositories:", repositories);
  
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching user repositories:", error);
      res.status(500).send("Error occurred while fetching user repositories");
    }
  });


  app.post("/create-branch", async (req, res) => {
    try {
      const { accessToken } = req.session;
      const { Octokit } = await import("@octokit/rest");
    const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
      const octokit = new Octokit({
        
        auth: accessToken,
        request: {
          fetch, // Pass the fetch function here
        },
      });
      // Fetch authenticated user's data
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
    const userData = userResponse.data;
    const owner = userData.login; // Use the owner's username from the user data
    const repo = "practiceRepo"; // Replace with the actual repository name
    const branchName = "second"; // Replace with the desired branch name
    const baseBranch = "master";
    const mainBranchResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches/${baseBranch}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  const ref= `refs/heads/${baseBranch}`;
  const mainBranchData = mainBranchResponse.data;
  const sha = mainBranchData.commit.sha;

    await octokit.request(`POST /repos/${owner}/${repo}/git/refs`, {
      owner,
      repo,
      ref,
      sha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    console.log(`Branch "${branchName}" created successfully.`);
    res.send("Branch created successfully");
    } catch (error) {
      console.error("Error creating branch:", error);
    res.status(500).send("Error occurred while creating the branch: " + error);
    }
  });

  app.post("/create-pull-request", async (req, res) => {
    try {
      const { accessToken } = req.session;
      const { Octokit } = await import("@octokit/rest");
      const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

      const octokit = new Octokit({
        auth: accessToken,
        request: {
          fetch, // Pass the fetch function here
        },
      });
  
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
  
      const userData = userResponse.data;
      const repoOwner = userData.login; // Use the owner's username from the user data
      const repoName = "Temperature-Conversion"; // Replace with the actual repository name
      const branchName = "branch1"; // Replace with the desired branch name
      const mainBranch="main";
  
      const mainBranchResponse = await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/branches/${mainBranch}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const mainBranchData = mainBranchResponse.data;
    const sha = mainBranchData.commit.sha;

    const ref = `refs/heads/${branchName}`;

      await axios.post(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`,
        {
          ref,
          sha,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  
      res.send("Branch created successfully");
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).send("Error occurred while creating the branch: "+error);
    }
    
  });

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


