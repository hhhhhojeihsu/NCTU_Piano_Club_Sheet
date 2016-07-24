// This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response)
{
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected')
    {
        LoginSuccess();
    }
    else if (response.status === 'not_authorized')
    {
        // The person is logged into Facebook, but not your app.
        InitialState();
    }
    else
    {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
        InitialState();
    }
}

// This function is called when someone finishes with the Login
// Button.  See the onlogin handler attached to it in the sample
// code below.
function checkLoginState()
{
    FB.getLoginStatus(function(response){
        statusChangeCallback(response);
    });
}

window.fbAsyncInit = function(){
    FB.init({
        appId      : '140237553072177',
        cookie     : true,  // enable cookies to allow the server to access 
                            // the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v2.6' // use version 2.6
    });

    // Now that we've initialized the JavaScript SDK, we call 
    // FB.getLoginStatus().  This function gets the state of the
    // person visiting this page and can return one of three states to
    // the callback you provide.  They can be:
    //
    // 1. Logged into your app ('connected')
    // 2. Logged into Facebook, but not your app ('not_authorized')
    // 3. Not logged into Facebook and can't tell if they are logged into
    //    your app or not.
    //
    // These three cases are handled in the callback function.

    FB.getLoginStatus(function(response){
        statusChangeCallback(response);
    });

};

// Load the SDK asynchronously
(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if(d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/zh_TW/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function successAPI(){
    FB.api('/me', function(response){
        //response.name is the name of sent object
        post('/process_fb', {name: response.name});
    });
}

//send post request
//reference: http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit

function post(path, params, method){
    method = method || "post"; // Set method to post by default if not specified.

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}

function showAdmin()
{
    document.getElementById('login_guest').style.display = "block";
    document.getElementById('show_admin_btn').style.display = "none";
    document.getElementById('text-between-line').innerText = "以管理員身分登入";
}

function LoginSuccess()
{
    FB.api('/me', function(res){
        if(window.location.href.indexOf("process_user") === -1) document.getElementById('fb-btn').style.display = "none";
        if(document.getElementById('status')) document.getElementById('status').innerHTML = "<button class='btn btn-primary btn-large btn-block' onclick='successAPI()' type='button'>以 " + res.name + " 的身分繼續</button>" + "<div id='not_me'><a onclick='showLogIn()' style='font-size: x-small'>(這不是我!!)</a></div>";
    });
}

function showLogIn()
{
    document.getElementById('fb-btn').style.display = "block";
    if(document.getElementById('not_me')) document.getElementById('not_me').style.display = "none";
}

function InitialState()
{
    document.getElementById('status').innerHTML = "";
    if(document.getElementById('not_me'))
    {
        //reference: http://stackoverflow.com/a/19298575/6007708
        document.getElementById('not_me').outerHTML = "";
    }
}
