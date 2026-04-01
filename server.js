const express = require("express");
const altUploadRoute = require("./backend/altUploadRoute");

const app = express();

app.use(express.static("public"));
app.use(altUploadRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});