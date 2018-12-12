/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

var express = require('express'); // app server
var writeFile = require('write');
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV1 = require('watson-developer-cloud/assistant/v1');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var toneDetection = require('./addons/tone_detection.js'); // required for tone detection
var maintainToneHistory = false;

// The following requires are needed for logging purposes
var uuid = require('uuid');
var vcapServices = require('vcap_services');
var basicAuth = require('basic-auth-connect');

var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// The app owner may optionally configure a cloudand db to track user input.
// This cloudand db is not required, the app will operate without it.
// If logging is enabled the app must also enable basic auth to secure logging
// endpoints
var cloudantCredentials = vcapServices.getCredentials('cloudantNoSQLDB');
var cloudantUrl = null;
if (cloudantCredentials) {
  cloudantUrl = cloudantCredentials.url;
}
cloudantUrl = cloudantUrl || process.env.CLOUDANT_URL; // || '<cloudant_url>';
var logs = null;
var app = express();

app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Bootstrap application settings
// Instantiate the Watson AssistantV1 Service as per WDC 2.2.0
var assistant = new AssistantV1({
  version: '2017-05-26'
});

// Instantiate the Watson Tone Analyzer Service as per WDC 2.2.0
var toneAnalyzer = new ToneAnalyzerV3({
  version: '2016-05-19'
});

// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: {},
    input: {}
  };

  if (req.body) {
    if (req.body.input) {
      payload.input = req.body.input;
    }
    if (req.body.context) {
      payload.context = req.body.context;
    } else {

      // Add the user object (containing tone) to the context object for
      // Assistant
      payload.context = toneDetection.initUser();
    }


    // Invoke the tone-aware call to the Assistant Service
    invokeToneConversation(payload, res);
  }
});





//ADDED CODE STARTS HERE
var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

//function for some input sterilizatino
function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

var basesize = 3;
var baseheadlines = ['World&#39;s First Underwater Villa In Maldives, For $50,000 A Night', 'Doctor&#39;s Wife Murdered in Bay Village', 'Americans on Moon!: Armstrong, Aldrin Land Safely'];
var basecontexts = ['Travel', 'Crime', 'Science'];
var addedsize = 0;
var addedheadlines = [];
var addedcontexts = [];
var Results = [];
var numresponses = [];

//json response for getting information for client: headline, headline context, whether it is from base set, and index in data store
app.post('/getSample', function(req, res){
	if (Math.random() < .5 || addedsize == 0){
		var rnd = Math.floor(Math.random()*basesize);
		res.send("<script>var sample = '" + baseheadlines[rnd] + "'; var headline_context = '" + basecontexts[rnd] + "'; var data = false</script>");
	}else{
		var rnd = Math.floor(Math.random()*addedsize);
		res.send("<script>var index = '"+ rnd +"'; var sample = '" + escapeHtml(addedheadlines[rnd]) + "'; var headline_context = '" + addedcontexts[rnd] + "'; var data = true</script>");
	}
});

//json response for adding a headline, takes headline and headline context, replys with verification
app.post('/addHeadline', function(req, res) {
    var headline = req.body.headline;
	var context = req.body.context;
	console.log("post received: %s", headline);
	addedheadlines.push(headline);
	addedcontexts.push(context);
	Results.push([]);
	numresponses.push(0);
	addedsize++;
	res.send("Thank you for your submission. <br>" + headline + "<br>" + context);
});

//json response for recieving data summary, constructs an html file in the response with proper formatting (formatting provided by Stephanie)
app.post('/getData', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('<head>'+
	'  <link rel="stylesheet" type="text/css" href="/css/report.css">'+
	'  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">'+
	'	<meta charset="utf-8" name="viewport" content="width=device-width, initial-scale=1">'+
	'	<title>Report</title> '+
	'</head>');
	res.write('<body>');
	for(var i = 0; i < addedsize; i++){
		res.write('<div>'+
	'<div id="head_container">'+
	'   <p id="heading">Survey Report for "' + addedheadlines[i] + '"</p>'+
	'</div>');
		for(var j = 0; j < numresponses[i]; j++){
			res.write('  <div id = "inner">'+
			'    <p id="subheading">Date/Time: ' + Results[i][j][0] + '</p>'+
			'    <p id="subheading">Participant: ' + Results[i][j][1] + '</p>'+
			'    <p id="subheading">Age: ' + Results[i][j][2] + '</p>'+
			'    <p id="subheading">Gender: ' + Results[i][j][3] + '</p>'+
			'  </div>'+
			'  <div id = "inner">'+
			'    <p id="subheading">Mood Bias: ' + Results[i][j][4] + '</p>'+
			'    <p id="subheading">Media Bias: ' + Results[i][j][5] + '</p>'+
			'    <p id="subheading">Content Bias: ' + Results[i][j][6] + '</p>'+
			'  </div>'+
			'   <div id = "inner">'+
			'    <p id="subheading">Reaction Score: ' + Results[i][j][7] + '</p>'+
			'    <p id="subheading">Reaction: ' + Results[i][j][8] + '</p>'+
			'  </div>'+
			'  <div id = "inner">'+
			'    <p id="subheading">Headline Inspires: ' + Results[i][j][9] + '</p>'+
			'  </div>'+
			'   <div id = "inner">'+
			'    <p id="subheading">Length Score: ' + Results[i][j][10] + '</p>'+
			'  </div>'+
			'<div></div>');
		}
		res.write('</div>');
	}
	res.write('</body>');
	res.end();
	
	
});
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

//json response for recieving finalized data of survey
app.post('/getLegData', function(req, res){
	console.log("recieved request");
	var result = [];
	var d = new Date();
  result.push(d.getFullYear() + " " + d.getMonth());
	result.push(req.body.operation);
	result.push(req.body.name);
	result.push(req.body.plocation);
	console.log(result);
	
	res.send("<script> var completed = true;</script>");
});

app.post('/getMessageData', function(req, res){
  console.log("getMessageData request");
  var senator = getSenatorList();
  var result = [];
  result.push(senator);

  res.send(result);
})


function getSenatorList() {
  var request = new XMLHttpRequest();
  var name = "test";

  // Create a new connection to senator
  request.onload = function() {
    if(request.readyState == 4 && request.status == 200) {
      var jsonString = request.responseText;
      var data = JSON.parse(jsonString);
      console.log(data.results[0].members[0].first_name + " " + data.results[0].members[0].last_name)
      name = data.results[0].members[0].first_name + " " + data.results[0].members[0].last_name;
    }
  }
  
  request.open('GET', 'https://api.propublica.org/congress/v1/115/house/members.json', false);
  request.setRequestHeader('X-API-Key', 'sRuDTqWN9FrPpXnYMmwWiq5B2caHhpkngcrWNV9R');
  request.send();
  
  return name;
}
//ADDED CODE ENDS HERE







/**
 * Updates the response text using the intent confidence
 *
 * @param {Object}
 *                input The request to the Assistant service
 * @param {Object}
 *                response The response from the Assistant service
 * @return {Object} The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  var id = null;

  if (!response.output) {
    response.output = {};
  } else {
    if (logs) {
      // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      logs.insert({'_id': id, 'request': input, 'response': response, 'time': new Date()});
    }
    return response;
  }

  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different
    // messages.
    // The confidence will vary depending on how well the system is trained. The
    // service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests
    // the service is unsure of the
    // user's intent . In these cases it is usually best to return a
    // disambiguation message
    // ('I did not understand your intent, please rephrase your question',
    // etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  if (logs) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert({'_id': id, 'request': input, 'response': response, 'time': new Date()});
  }
  return response;
}

/**
 * @author April Webster
 * @returns {Object} return response from Assistant service
 *          invokeToneConversation calls the invokeToneAsync function to get the
 *          tone information for the user's input text (input.text in the
 *          payload json object), adds/updates the user's tone in the payload's
 *          context, and sends the payload to the Assistant service to get a
 *          response which is printed to screen.
 * @param {Json}
 *                payload a json object containing the basic information needed
 *                to converse with the Assistant Service's message endpoint.
 * @param {Object}
 *                res response object
 *
 */
function invokeToneConversation(payload, res) {
  toneDetection.invokeToneAsync(payload, toneAnalyzer).then(function(tone) {
    toneDetection.updateUserTone(payload, tone, maintainToneHistory);
    assistant.message(payload, function(err, data) {
      var returnObject = null;
      if (err) {
        console.error(JSON.stringify(err, null, 2));
        returnObject = res.status(err.code || 500).json(err);
      } else {
        returnObject = res.json(updateMessage(payload, data));
      }
      return returnObject;
    });
  }).catch(function(err) {
    console.log(JSON.stringify(err, null, 2));
  });
}

/**
 * Enable logging Must add an instance of the Cloudant NoSQL DB to the
 * application in BlueMix and add the Cloudant credentials to the application's
 * user-defined Environment Variables.
 */
if (cloudantUrl) {
  // If logging has been enabled (as signalled by the presence of the
  // cloudantUrl) then the
  // app developer must also specify a LOG_USER and LOG_PASS env vars.
  if (!process.env.LOG_USER || !process.env.LOG_PASS) {
    throw new Error('LOG_USER OR LOG_PASS not defined, both required to enable logging!');
  }
  // add basic auth to the endpoints to retrieve the logs!
  var auth = basicAuth(process.env.LOG_USER, process.env.LOG_PASS);
  // If the cloudantUrl has been configured then we will want to set up a nano
  // client
  var nano = require('nano')(cloudantUrl);
  // add a new API which allows us to retrieve the logs (note this is not
  // secure)
  nano.db.get('food_coach', function(err) {
    if (err) {
      console.error(err);
      nano.db.create('food_coach', function(errCreate) {
        console.error(errCreate);
        logs = nano.db.use('food_coach');
      });
    } else {
      logs = nano.db.use('food_coach');
    }
  });

  // Endpoint which allows deletion of db
  app.post('/clearDb', auth, function(req, res) {
    nano.db.destroy('food_coach', function() {
      nano.db.create('food_coach', function() {
        logs = nano.db.use('food_coach');
      });
    });
    return res.json({'message': 'Clearing db'});
  });

  // Endpoint which allows conversation logs to be fetched
  // csv - user input, conversation_id, timestamp

  app.get('/chats', auth, function(req, res) {
    logs.list({
      include_docs: true,
      'descending': true
    }, function(err, body) {
      console.error(err);
      // download as CSV
      var csv = [];
      csv.push([
        'Id',
        'Question',
        'Intent',
        'Confidence',
        'Entity',
        'Emotion',
        'Output',
        'Time'
      ]);
      body.rows.sort(function(a, b) {
        if (a && b && a.doc && b.doc) {
          var date1 = new Date(a.doc.time);
          var date2 = new Date(b.doc.time);
          var t1 = date1.getTime();
          var t2 = date2.getTime();
          var aGreaterThanB = t1 > t2;
          var equal = t1 === t2;
          if (aGreaterThanB) {
            return 1;
          }
          return equal
            ? 0
            : -1;
        }
      });
      body.rows.forEach(function(row) {
        var question = '';
        var intent = '';
        var confidence = 0;
        var time = '';
        var entity = '';
        var outputText = '';
        var emotion = '';
        var id = '';

        if (row.doc) {
          var doc = row.doc;
          if (doc.response.context) {
            id = doc.response.context.conversation_id;
          }

          if (doc.response.context && doc.response.context.user) {
            emotion = doc.response.context.user.tone.emotion.current;
          }

          if (doc.request && doc.request.input) {
            question = doc.request.input.text;
          }
          if (doc.response) {
            intent = '<no intent>';
            if (doc.response.intents && doc.response.intents.length > 0) {
              intent = doc.response.intents[0].intent;
              confidence = doc.response.intents[0].confidence;
            }
            entity = '<no entity>';
            if (doc.response.entities && doc.response.entities.length > 0) {
              entity = doc.response.entities[0].entity + ' : ' + doc.response.entities[0].value;
            }
            outputText = '<no dialog>';
            if (doc.response.output && doc.response.output.text) {
              outputText = doc.response.output.text.join(' ');
            }
          }
          time = new Date(doc.time).toLocaleString();
        }
        csv.push([
          id,
          question,
          intent,
          confidence,
          entity,
          emotion,
          outputText,
          time
        ]);
      });
      res.json(csv);
    });
  });
}

module.exports = app;
