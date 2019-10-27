const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// MY OCD of colorful console.logs for debugging... IT HELPS
const error = chalk.bold.red;
const success = chalk.keyword("green");

var db = require("./models");
var PORT = 3000;

var app = express();

app.use(logger("dev"))
app.use(express.urlencoded({extended: true}))
app.use(express.json());
app.use(express.static("public"))

mongoose.connect("mongodb://localhost/webscrape", {useNewUrlParser: true});

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
        fs.writeFile("hackernews.json", JSON.stringify(news), function(err) {
          if (err) throw err;
          console.log("Saved!");
        });
        console.log(success("Browser Closed"));
      } catch (err) {
        // Catch and display errors
        console.log(error(err));
        await browser.close();
        console.log(error("Browser Closed"));
      }
    })();

})


app.listen(PORT, function() {
  console.log('App is running')
})