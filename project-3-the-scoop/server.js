// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  // claude : added properties 'comments' and 'nextCommentId'
  comments: {},
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  
  // claude : added routes for comments (objects, upvoting and downvoting)
  
  '/comments': {
    'POST': createComment 
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment    
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}

// claude : added a method to create a comment
function createComment(url, request) {
  // retrieve the comment from the request body
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (requestComment && requestComment.body && requestComment.username &&
    requestComment.articleId && database.users[requestComment.username]) {
    // the comment exists and is completed

    // retrieve the article the article the comment belongs to
    const savedArticle = database.articles[requestComment.articleId];
    
    if(savedArticle) {
      // the article is found

      // create the comment object
      const comment = {
        id: database.nextCommentId++,
        body: requestComment.body,
        username: requestComment.username,
        articleId: requestComment.articleId,
        upvotedBy: [],
        downvotedBy: []
      };
  
      // add the comment to the database
      database.comments[comment.id] = comment;
      // add the comment id to the article's list of comment ids
      database.articles[comment.articleId].commentIds.push(comment.id);
      // add the comment id to the user's list of comment ids
      database.users[comment.username].commentIds.push(comment.id);

      // the response is OK with the comment in the body
      response.body = {comment: comment};
      response.status = 201;  
    } else {
      response.status = 400;
    }

  } else {
    response.status = 400;
  }

  return response;
}

// claude : added a method to update a comment
function updateComment(url, request) {
  // retrieve the comment id from the request
  const id = Number(url.split('/').filter(segment => segment)[1]);
  // retrieve the comment from the database
  const savedComment = database.comments[id];
  // retrieve the comment from the body
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (!id || !requestComment) {
    response.status = 400;
  } else if (!savedComment) {
    response.status = 404;
  } else {
    // the request is complete and the comment exist in db

    // update the comment
    savedComment.body = requestComment.body || savedComment.body;

    // the response is OK with the comment in the body
    response.body = {article: savedComment};
    response.status = 200;
  }

  return response;
}

// claude : added a method to delete a comment
function deleteComment(url, request) {
  // retrieve the id from the url
  const id = Number(url.split('/').filter(segment => segment)[1]);
  // retrieve the comment from the database
  const savedComment = database.comments[id];
  const response = {};

  if (savedComment) {
    // the comment exist in the database

    // retrieve the article the article the comment belongs to
    const savedArticle = database.articles[savedComment.articleId];
    if(savedArticle) {
      // the article is found

      // remove the comment from the database
      database.comments[savedComment.id] = null;
      // remove the comment id from the article's list of comment ids
      savedArticle.commentIds.splice(savedArticle.commentIds.indexOf(savedComment.id), 1);
      // remove the comment id from the user's list of comment ids
      const userCommentIds = database.users[savedComment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);

      // the response is 204
      response.status = 204;  

    } else {
      response.status = 404;      
    }

  } else {
    response.status = 404;
  }

  return response;
}

// claude : added a method to upvote a comment
function upvoteComment(url, request) {
  // retrieve the id from the url
  const id = Number(url.split('/').filter(segment => segment)[1]);
  // retrieve the username from the body
  const username = request.body && request.body.username;
  // retrieve the comment from the database
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    // the comment is found and the user exists in database

    // call the method to upvote the comment
    savedComment = upvote(savedComment, username);

    // the response is OK with the comment in the body
    response.body = {comment: savedComment};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

// claude : added a method to downvote a comment
function downvoteComment(url, request) {
  // retrieve the id from the url
  const id = Number(url.split('/').filter(segment => segment)[1]);
  // retrieve the username from the body
  const username = request.body && request.body.username;
  // retrieve the comment from the database
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    // the comment is found and the user exists in database

    // call the method to upvote the comment
    savedComment = downvote(savedComment, username);

    // the response is OK with the comment in the body
    response.body = {comment: savedComment};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

// Write all code above this line.

const http = require('http');
const url = require('url');

// claude : added import yamljs and fs modules
const YAML = require('yamljs');
const fs = require('fs');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

// claude : added a method to load the database from file
function loadDatabase() {
  if(fs.existsSync("./database.yml")) {
    // the file exists ==> we read its content
    return YAML.load("./database.yml");
  }
}

// claude : added a method to save the database to file
function saveDatabase() {
  // serialize the database to yaml
  var yamlDb = YAML.stringify(database);
  // write the yaml to file
  fs.writeFile("./database.yml", yamlDb, "utf8", (err, written, string) => {
    if(err) {
      console.log(err);
    }
  });
}

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', null);
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});