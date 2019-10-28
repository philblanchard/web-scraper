const puppeteer = require("puppeteer");
const chalk = require("chalk");
// var fs = require("fs");
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// MY OCD of colorful console.logs for debugging... IT HELPS
const error = chalk.bold.red;
const success = chalk.keyword("green");

var db = require("./models");
var PORT = process.env.PORT || 3000;

var app = express();

app.use(logger("dev"))
app.use(express.urlencoded({extended: true}))
app.use(express.json());
app.use(express.static("public"))

var MONGOOSE_URI = process.env.MONGODB_URI || "mongodb://localhost/webscrape"

mongoose.connect(MONGOOSE_URI, {useNewUrlParser: true});

app.get("/scrape", function(req, res){
    (async () => {
      try {
        // open the headless browser
        var browser = await puppeteer.launch({ headless: true });
        // open a new page
        var page = await browser.newPage();
        // enter url in page
        await page.goto(`https://news.ycombinator.com/`);
        await page.waitForSelector("a.storylink");
    
        var news = await page.evaluate(() => {
          var titleNodeList = document.querySelectorAll(`a.storylink`);
          var titleLinkArray = [];
          for (var i = 0; i < titleNodeList.length; i++) {
            titleLinkArray[i] = {
              title: titleNodeList[i].innerText.trim(),
              link: titleNodeList[i].getAttribute("href")
            };
          }
          return titleLinkArray;

        });
        // console.log(news);
        await browser.close();
        db.Article.create(news)
        .then(function(dbArticle){
          console.log(dbArticle)
        })
        .catch(function(err){
          console.log(err)
        })
        // Writing the news inside a json file
        // fs.writeFile("hackernews.json", JSON.stringify(news), function(err) {
        //   if (err) throw err;
        //   console.log("Saved!");
        // });
        console.log(success("Browser Closed"));
      } catch (err) {
        // Catch and display errors
        console.log(error(err));
        await browser.close();
        console.log(error("Browser Closed"));
      }
    })();

});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.listen(PORT, function() {
  console.log('App is running')
})