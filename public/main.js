/**
 * Frontend scripts //TODO check and divide in separate files 
 */

 // app container
let app = {};

app.config = {
    sessionToken: false
};

app.client = {
    request: (params) => {
        // Validate and set default values to parameters
        headers = typeof(params.headers) == 'object' && params.headers !== null ? params.headers : {};
        path = typeof(params.path) == 'string' ? params.path : '/';
        method = typeof(params.method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(params.method.toUpperCase()) > -1 ? params.method.toUpperCase() : 'GET';
        queryStringObject = typeof(params.queryStringObject) == 'object' && params.queryStringObject !== null ? params.queryStringObject : {};
        payload = typeof(params.payload) == 'object' && params.payload !== null ? params.payload : {};
        callback = typeof(params.callback) == 'function' ? params.callback : false;
      
        // For each query string parameter sent, add it to the path
        let requestUrl = path + '?',
            index = 0,
            lastIndex = Object.keys(queryStringObject).length - 1;

        for(let queryKey in queryStringObject) {
            if(queryStringObject.hasOwnProperty(queryKey)) {
                index++;
                requestUrl +=queryKey + '=' + queryStringObject[queryKey];

                if(index !== lastIndex) {
                    requestUrl += '&';
                }
            }
        }
      
        // Form the http request as a JSON type
        let xhr = new XMLHttpRequest();
        xhr.open(method, requestUrl, true);
        xhr.setRequestHeader("Content-type", "application/json");
      
        // For each header sent, add it to the request
        for(let headerKey in headers) {
           if(headers.hasOwnProperty(headerKey)) {
             xhr.setRequestHeader(headerKey, headers[headerKey]);
           }
        }
      
        // Add sessiontoken as a header
        if(app.config.sessionToken) {
          xhr.setRequestHeader("token", app.config.sessionToken.id);
        }
      
        //Handle the response
        xhr.onreadystatechange = () => {
            if(xhr.readyState == XMLHttpRequest.DONE) {
              let statusCode = xhr.status;
              let responseReturned = xhr.responseText;
      
              // Callback if requested
              if(callback) {
                try {
                  let parsedResponse = JSON.parse(responseReturned);
                  callback(statusCode, parsedResponse);
                } catch(e) {
                  callback(statusCode, false);
                }
              }
            }
        }
      
        // Send the payload as JSON
        let payloadString = JSON.stringify(payload);
        xhr.send(payloadString);
      }
};

// Bind the forms
app.bindForms = () => {
    document.querySelector("form").addEventListener("submit", function(e) {
      // Stop it from submitting
      e.preventDefault();
      let formId = this.id;
      let path = this.action;
      let method = this.method.toUpperCase();
      let form = document.querySelector("#" + formId + " .formError");
  
      // Hide the error message (if it's currently shown due to a previous error)
      form.style.display = 'hidden';
  
      // Turn the inputs into a payload
      let payload = {};
      let elements = this.elements;
      for(let i = 0; i < elements.length; i++){
        if(elements[i].type !== 'submit'){
          let valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
          payload[elements[i].name] = valueOfElement;
        }
      }
      
      let params = {path, method, payload};
      params.callback = (statusCode, responsePayload) => {
        // Display an error on the form if needed
        if(statusCode !== 200){
  
          // Try to get the error from the api, or set a default error message
          let error = typeof(responsePayload.message) == 'string' ? responsePayload.message : 'An error has occured, please try again';
  
          // Set the formError field with the error text//TODO one selector
          form.innerHTML = error;
  
          // Show (unhide) the form error field on the form
          form.style.display = 'block';
        } else {
          // If successful, send to form response processor
          app.formResponseProcessor(formId, payload, responsePayload);
        }
      }

      app.client.request(params);
    });
  };
  
  // Form response processor
  app.formResponseProcessor = function(formId, requestPayload, responsePayload){
    // If account creation was successful, try to immediately log the user in
    if(formId == 'accountCreate'){
      // Take the email and password, and use it to log the user in
      let newPayload = {
        'email' : requestPayload.email,
        'password' : requestPayload.password
      };
  
      app.client.request(undefined,'api/token','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
        // Display an error on the form if needed
        if(newStatusCode !== 200){
          //TODO Move to error handler 
          // Set the formError field with the error text
          document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';
  
          // Show (unhide) the form error field on the form
          document.querySelector("#"+formId+" .formError").style.display = 'block';
  
        } else {
          // If successful, set the token and redirect the user
          app.setSessionToken(newResponsePayload);
          window.location = '/menu';
        }
      });
    }
    // If login was successful, set the token in localstorage and redirect the user
    if(formId == 'sessionCreate'){
      app.setSessionToken(responsePayload);
      window.location = '/menu';
    }
  };
  
  // Get the session token from localstorage and set it in the app.config object
app.getSessionToken = () => {
  let tokenString = localStorage.getItem('token');
  if(typeof(tokenString) == 'string'){
    try {
      let token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      app.setLoggedInClass(typeof(token) == 'object');
    } catch(e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function(add){
  let target = document.querySelector("body"),
      loggedInClass = add ? 'loggedIn' : 'loggedIn';

  target.classList.remove(loggedInClass);
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function(token){
  app.config.sessionToken = token;
  let tokenString = JSON.stringify(token);
  localStorage.setItem('token',tokenString);

  app.setLoggedInClass(typeof(token) == 'object');
};

// Renew the token
app.renewToken = function(callback){
  let currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
  if(currentToken){
    // Update the token with a new expiration
    let payload = {
      'id' : currentToken.id,
      'extend' : true,
    };
    let params = {
      path: 'api/token',
      method: 'PUT',
      payload
    }
    params.callback = (statusCode, responsePayload) => {
      //TODO return token in PUT 
      // Display an error on the form if needed
      if(statusCode == 200){
        // Get the new token details
        let queryStringObject = {'id' : currentToken.id};
        app.client.request(undefined,'api/token', 'GET', queryStringObject, undefined, function(statusCode, responsePayload){
          // Display an error on the form if needed
          if(statusCode == 200){
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    }
    
    app.client.request(params);
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Loop to renew token often
app.tokenRenewalLoop = () => {
  setInterval(() => {
    app.renewToken((err) => {
      if(!err){
        console.log("Token renewed successfully @ "+Date.now());
      }
    });
  }, 1000 * 60);
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submissions
  app.bindForms();
  // Get the token from localstorage
  app.getSessionToken();
  // Renew token
  app.tokenRenewalLoop();
};

// Call the init processes after the window loads
window.onload = () => {
  app.init();
};