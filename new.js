const fs = require('fs'); // file system -- allows us to modify files
const http = require('http'); // create server and listen for HTTP requests
// const {Http2ServerRequest} = require('http2'); 
const url = require('url'); // routing URL's based on the HTTP request

// Imports usually happen at the top of the file and after the core modules
const replaceTemplate = require('./modules/replaceTemplate'); // we do not need to specify .js

////////////////
/// FILES

// Synchronous -- blocking code
//      - Code is executed in sequence, so in order for further operations to be called, the thread (ie. the sequential order at which code is executed) needs to wait for the previous call to be fully completed. This results in slower processing times for HTTP requests, resulting in longer loading times across multiple concurrent users since Node.js is single-threaded, and that only one user can be fully processed at any given time.

const textInput = fs.readFileSync(`${__dirname}/txt/input.txt`, 'utf-8');
const textAppend = fs.readFileSync(`${__dirname}/txt/append.txt`, 'utf-8');

const text = "Hello World!";
fs.writeFileSync(`${__dirname}/txt/output.txt`, text);
console.log(`Text written!`);

fs.writeFileSync("final.txt", `${textInput}\n${textAppend}`);
console.log("Final text written!");

// Asynchronous -- non-blocking 
//      - Requests can be handled without having any dependency on one another. This means HTTP requests can be processed faster, resulting in faster loading times. 

fs.readFile(`${__dirname}/txt/start.txt`, 'utf-8', (err, data) => {

    if (err) return (console.log("error!"));

    fs.readFile(`${__dirname}/txt/${data}.txt`, 'utf-8', (err, data2) => {

        if (err) return (console.log("error!"));

        console.log(data2);

        fs.readFile(`${__dirname}/txt/append.txt`, 'utf-8', (err, data3) => {

            if (err) return (console.log("error!"));
            
            console.log(data3);

            // No need for `data` parameter => data not being read
            fs.writeFile(`${__dirname}/txt/output.txt`, `${data2}\n${data3}`, 'utf-8', (err) => {
                console.log("File written!");
            });
        });
    });
});

////////////////
/// SERVER

// Reading template HTML code synchronously. The code is top-level code so is read once at the start of the application and not repeated since the code is not within the callback function. 
const tempOverview = fs.readFileSync(`${__dirname}/templates/template-overview.html`, 'utf-8');
const tempCard = fs.readFileSync(`${__dirname}/templates/template-card.html`, 'utf-8');
const tempProduct = fs.readFileSync(`${__dirname}/templates/template-product.html`, 'utf-8');

// Read JSON data one time synchronously so that there is no need to read and send back the data every time the user goes to the api route. 
// Make sure the JSON reading is above the http.createServer (ie. http.createServer() function) as top level code is executed exactly once while the callback function is going to be executed for every request which is not what we want as we know synchronous code takes longer to process (blocking code).
const data = fs.readFileSync(`${__dirname}/dev-data/data.json`, 'utf-8');
const dataObj = JSON.parse(data); // Array of all the objects in data.json

const server = http.createServer((req, res) => {

    // Note: req.url() is the URL name of the HTTP request
    // url.parse() returns an object with different queries.
    // In our case, we have queries named 'query' and 'pathname' which represent the `id` and the `pathname` of that URL.
    // Therefore, two variables called 'query' and 'pathname' will be created with the respective values of the queries saved within these variables.
    
    // The query is an object, and by definition means 'a request for data or information from a database table or combination of tables'
    const { query, pathname } = url.parse(req.url, true);

    // Overview page
    // Previously, by saying "pathName === '/product'", we're calling the JSON property which we can't just simply call and so this comparison won't work. 
    // Therefore, the thread will jump down to the else statement and say "Page not found". 
    
    // So to make the URL routing work, we need to parse the URL link of the HTTP request.
    // Given that we've hard-coded the URL link to be for the product page to be '/product?id={%ID%}' where {%ID%} is the placeholder.
    // req.url will return '/product?id=0' for example.

    if (pathname === '/' || pathname === "/overview") {
        // Whenever the URL goes to '127.0.0.1:8000/' or '127.0.0.1:8000/overview', we need to read the template overview.
        // Reading the file every time there is a new request is pretty inefficient, so we should read the code once synchronously when the application starts up. We can do this by reading it outside of the callback function as top-level code, such that whenever we need the file we can just simply call it. 

        // dataObj contains an array of all the objects within data.json 
        // Loop through the dataObj array, such that for each object we can replace the placeholders in the template with the data from data.json.

        // The map() method creates a new array populated with the results of calling a provided function on every element in the calling array. 

        // We loop over the data object which holds all of the products, and in each iteration we will replace the placeholders in the templateCard with the current product
        // In an arrow function, if we don't have curly braces replaceTemplate() will get automatically returned (the arrow implicity states the 'return' statement)
        // Logging cardsHtml to the console returns a series of strings that aren't necessarily joined together as one big collective string, which is what we want.
        // We can achieve this by rather than having a series of smaller strings, we can join them up using the .join('') function at the end of everything for the variable cardsHtml. 
        const cardsHtml = dataObj.map(el => replaceTemplate(tempCard, el)).join('');

        // Replaces the placeholder in the overview template with the one giant string of HTML code w/ placeholders replaced.
        const output = tempOverview.replace('{%PRODUCT_CARDS%}', cardsHtml);

        // Also, don't forget to specify the file-type via res.writeHead(status_code (could be 200 if working properly or 404 if not), {'content-type': text/html});
        // Or in complicated-lingo: "Set the response HTTP header with HTTP status and content type"
        res.writeHead(200, {'content-type': 'text/html'});

        // Send the response body the HTML code w/ the placeholders replaced.
        res.end(output);
    
    // Product page
    } else if (pathname === '/product') {
        res.writeHead(200, {'content-type': 'text/html'}); // New URL link, so need to restate content-type and status code again.
        // Retrieving the product that we want to display
        // Note: query returns an object in the format of [Object: null prototype] { id: '0' }
        const product = dataObj[query.id];
        const output = replaceTemplate(tempProduct, product);

        res.end(output); // Finally, send the output 

    // API
    } else if (pathname === '/api') {

        // sends a response header to the request; doesn't relate to the content
        res.writeHead(200, {'content-type': 'application/json'}); // telling browser that the data being sent over is going to be JSON
        res.end(data); // printing out the API data on the browser
    } 
    
    // Not Found (404 error)
    else {
        res.writeHead(404, {
            'content-type': 'text/html',
            'my-own-header': 'hello-world'
        });
        res.end('<h1>Page not found</h1>');
    }
});


// To run local host in broswer -- '127.0.0.1:8000'
// Listens for HTTP requests on port 8000
const PORT = process.env.PORT || 8000;

server.listen(PORT, '127.0.0.1', () => {
    console.log("Listening to local host...");
});
