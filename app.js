const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;

const initialiseDBserver = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`DB Server Initiliazed ,UP and RUNNING`);
    });
  } catch (error) {
    console.log(`DBserver is ${error.message}`);
    process.exit(1);
  }
};

initialiseDBserver();

// ### API 1

// #### Path: `/login/`

// #### Method: `POST`

app.post("/login/", async (request, response) => {
  console.log("entered");
  const { username, password } = request.body;
  const dbQuery = `
  SELECT *
  FROM 
  user 
  WHERE username = '${username}'`;
  const dbUser = await db.get(dbQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const comparePassword = await bcrypt.compare(password, dbUser.password);
    if (comparePassword === false) {
      response.status(400);
      console.log("invalid password");
      response.send("Invalid password");
    } else {
      const payLoad = {
        username: username,
      };
      const jwtToken = jwt.sign(payLoad, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    }
  }
});

// AUTHENTICATION OF THE USER

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    console.log("here");
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payLoad) => {
      if (error) {
        console.log(error.message);
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payLoad.username;
        // response.send("VALID JWT TOKEN");
        next();
      }
    });
  }
};

// ### API 2

// #### Path: `/states/`

// #### Method: `GET`

app.get("/states/", authentication, async (request, response) => {
  console.log("entered");
  const { username } = request;
  console.log(username);
  const dbQuery = `
  SELECT 
  state_id AS  stateId,
  state_name AS stateName,
  population
  FROM 
  state 
  `;
  const dbUser = await db.all(dbQuery);
  response.send(dbUser);
});

// ### API 3

// #### Path: `/states/:stateId/`

// #### Method: `GET`
app.get("/states/:stateId", authentication, async (request, response) => {
  const { stateId } = request.params;
  const { username } = request;
  console.log(username);
  const dbQuery = `
  SELECT 
  state_id AS  stateId,
  state_name AS stateName,
  population
  FROM 
  state 
  WHERE state_id = ${stateId}
  `;
  const dbUser = await db.get(dbQuery);
  response.send(dbUser);
});

// ### API 4

// #### Path: `/districts/`

// #### Method: `POST`
app.post("/districts/", authentication, async (request, response) => {
  const { username } = request.username;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  console.log(districtName, stateId, cases, cured, active, deaths);
  const dbQuery = `
  INSERT INTO 
  district (district_name, state_id, cases, cured, active, deaths) 
  VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})
  `;
  const dbUser = await db.run(dbQuery);
  const district_id = dbUser.lastID;
  console.log(district_id);
  response.send("District Successfully Added");
});

// ### API 5

// #### Path: `/districts/:districtId/`

// #### Method: `GET`
app.get("/districts/:districtId", authentication, async (request, response) => {
  const { districtId } = request.params;

  const dbQuery = `
  SELECT 
  district_id AS districtId,
  district_name AS districtName, 
  state_id AS stateId, cases, cured, active, deaths 
  deaths
  FROM 
  district 
  WHERE district_id = ${districtId}
  `;
  const dbUser = await db.get(dbQuery);
  response.send(dbUser);
});

// ### API 6

// #### Path: `/districts/:districtId/`

// #### Method: `DELETE`
app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const dbQuery = `
  DELETE 
  FROM 
  district 
  WHERE district_id = ${districtId}
  `;
    const dbUser = await db.run(dbQuery);
    response.send("District Removed");
  }
);

// ### API 7

// #### Path: `/districts/:districtId/`

// #### Method: `PUT`
app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    console.log(districtName, stateId, cases, cured, active, deaths);
    const dbQuery = `
  UPDATE 
  district 
  SET 
  district_name = '${districtName}',
   state_id = ${stateId}, 
   cases = ${cases}, 
   cured = ${cured}, 
   active = ${active}, 
   deaths =  ${deaths}
  WHERE district_id = ${districtId}
  `;
    const dbUser = await db.run(dbQuery);

    response.send("District Details Updated");
  }
);

// ### API 8

// #### Path: `/states/:stateId/stats/`

// #### Method: `GET`
app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;

    const dbQuery = `
  SELECT 
  sum(cases) AS totalCases,
  sum(cured) AS totalCured,
  sum(active) AS totalActive,
  sum(deaths) AS totalDeaths
  FROM 
  district 
  WHERE state_id = ${stateId}
  GROUP BY state_id
  `;
    const dbUser = await db.get(dbQuery);
    response.send(dbUser);
  }
);
module.exports = app;
