var version;
var app = {
  initialize: function() {
    this.bindEvents();
  },
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  onDeviceReady: function() {
    // 詢問定位權限
    cordova.plugins.diagnostic.requestLocationAuthorization(function(status){
    }, function(error){
      window.plugins.toast.showShortBottom(error);
    });
    
    navigator.appInfo.getAppInfo(function(appInfo) {
      version = appInfo.version;
      $("footer").fadeIn();
      if(localStorage.Version == version) {
        $("#SplashScreen").fadeIn();
        window.setTimeout(function() {
          ShowMain();
        }, 3000);
      } else
        $("#Div_Carousel").fadeIn();
    }, function(err) {
        window.plugins.toast.showShortBottom(err);
    });
    
    document.addEventListener("backbutton", onBackKeyDown, false);
    window.addEventListener('message', function(e) {
      if(e.origin != 'http://myth-hair.frog.tw')
        return;
      var data = JSON.parse(e.data);
      switch(data.Title) {
      case "onClose":
        backbutton = true;
        setTimeout(function(){ backbutton = false; }, 2000);
        window.plugins.toast.showShortBottom('再按一次關閉程式');
        break;
      case "onSpinnerShow":
        window.plugins.spinnerDialog.show(null, null, true);
        break;
      case "onSpinnerHide":
        window.plugins.spinnerDialog.hide();
        break;
      case "onToastShow":
        window.plugins.toast.showShortBottom(data.Message);
        break;
      case "onBarcodeScan":
        //詢問相機權限
        cordova.plugins.diagnostic.requestRuntimePermissions(function(statuses){
          cordova.plugins.barcodeScanner.scan(
            function(result) {
              if(result.format == "QR_CODE") {
                document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onBarcodeScan", Type: data.Type, Result: result.text}), 'http://myth-hair.frog.tw');
              }
            }, 
            function(error) {
              window.plugins.toast.showShortBottom("Scanning failed: " + error);
            }
          );
        }, function(error){
          window.plugins.toast.showShortBottom(error);
        },[
          cordova.plugins.diagnostic.runtimePermission.CAMERA
        ]);
        break;
      case "onReLogin":
        if(localStorage.Account && localStorage.Password)
          LoginSubmit('Login', data.Action, "", localStorage.Account, localStorage.Password, "");
        else if(localStorage.FacebookID)
          FBLoginSubmit('Login', data.Action, '');
        break;
      case "onLogout":
        localStorage.removeItem("Account");
        localStorage.removeItem("Password");
        localStorage.removeItem("FacebookID");
        navigator.splashscreen.show();
        window.setTimeout(function() {
          $('#iframe').attr('src', "http://myth-hair.frog.tw/phonegap.php");
        }, 2000);
        break;
      case "onLogin":
        LoginSubmit('Login', false, "", data.Account, data.Password, "");
        break;
      case "onFBLogin":
        FBLoginSubmit('Login', false, "");
        break;
      case "onRegister":
        LoginSubmit('Register', false, data.Role, data.Account, data.Password, data.Name);
        break;
      case "onFBRegister":
        if(data.Role == "")
          window.plugins.toast.showShortBottom('請選擇註冊身分');
        else
          FBLoginSubmit('Register', false, data.Role);
        break;
      case "onFBConnect":
        FBLoginSubmit('Connect', data.Role + '_profiles', data.Role);
        break;
      case "onFBOpen":
        window.open('fb://' + data.URL, '_system', 'location=no');
        break;
      case "onNewPicture":
        if(data.SourceType == "CAMERA") {
          cordova.plugins.diagnostic.requestRuntimePermissions(function(statuses){
            getPhoto(data);
          }, function(error){
            window.plugins.toast.showShortBottom(error);
          },[
            cordova.plugins.diagnostic.runtimePermission.CAMERA
          ]);
        } else if(data.SourceType == "PHOTOLIBRARY") {
          cordova.plugins.diagnostic.requestRuntimePermissions(function(statuses){
            getPhoto(data);
          }, function(error){
            window.plugins.toast.showShortBottom(error);
          },[
            cordova.plugins.diagnostic.runtimePermission.READ_EXTERNAL_STORAGE
          ]);
        }
        break;
      }
    }, false);
    
    var push = PushNotification.init({
      android: {
        senderID: "100971030124",
        icon: "logo",
        forceShow: true,
        clearNotifications: false
      },
      ios: {
        senderID: "100971030124",
        alert: true,
        badge: true,
        sound: true
      },
      windows: {}
    });
    push.on('registration', function(data) {
      localStorage.RegistrationID = data.registrationId;
    }).on('notification', function(data) {
    }).on('error', function(e) {
      console.log("push error");
    });
  }
};
app.initialize();

$(document).ready(function(){
  $("#Carousel").owlCarousel({
    margin: 0,
    items: 1,
  });
  $("#iframe").height(window.innerHeight);
});

var backbutton = false;
function onBackKeyDown() {
  if(backbutton)
    (navigator.app && navigator.app.exitApp()) || (device && device.exitApp());
  else
    document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onBackKeyDown"}), 'http://myth-hair.frog.tw');
}

/* URL Scheme
function handleOpenURL(url) {
  if(url.startsWith("mythhair://")) {
    if(url.search("register") != -1) {
      var params, Account, Password;
      for (params in url.split("?")[1].split("&")) {
        switch(params.split("=")[0]) {
        case "Account":
          Account = params.split("=")[1];
          break;
        case "Code":
          Code = params.split("=")[1];
          break;
        }
      }
      LoginSubmit('Login', false, "", Account, Password, "");
    }
    //document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onRedirect", Action: url}), 'http://myth-hair.frog.tw');
  }
}*/

function LoginSubmit(Type, Action, Role, Account, Password, Name) {
  window.plugins.spinnerDialog.show(null, null, true);
  $.post('http://myth-hair.frog.tw/login.php', {Type: Type, Role: Role, Account: Account, Password: Password, Name: Name, RegistrationID: localStorage.RegistrationID}, function(data, status){
    if(status == "success") {
      if(data == "Login") {
        localStorage.Account = Account;
        localStorage.Password = Password;
        localStorage.removeItem("FacebookID");
        if(Action)
          document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onRedirect", Action: Action}), 'http://myth-hair.frog.tw');
        else
          $('#iframe').attr('src', "http://myth-hair.frog.tw/phonegap.php");
      } else if(data == "RegisterOK") {
        localStorage.Account = Account;
        localStorage.Password = Password;
        localStorage.removeItem("FacebookID");
        window.plugins.toast.showLongBottom("註冊成功，請確認信箱並點選認證網址完成最後註冊步驟。");
      } else
        window.plugins.toast.showShortBottom(data);
    } else {
      window.plugins.toast.showShortBottom(data);
    }
  });
  window.plugins.spinnerDialog.hide();
}

function FBLoginSubmit(Type, Action, Role) {
  facebookConnectPlugin.login(["public_profile", "email"],
    function (response) {
      if (response.status === 'connected') {
        facebookConnectPlugin.getAccessToken(function(token) {
          $.post('http://myth-hair.frog.tw/loginFB.php', {Type: Type, Role: Role, AccessToken: token, RegistrationID: localStorage.RegistrationID}, function(data, status){
            if(status == "success" && data == "OK") {
              localStorage.FacebookID = response.authResponse.userID;
              localStorage.removeItem("Account");
              localStorage.removeItem("Password");
              if(Action)
                document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onRedirect", Action: Action}), 'http://myth-hair.frog.tw');
              else
                $('#iframe').attr('src', "http://myth-hair.frog.tw/phonegap.php");
              return;
            } else {
              window.plugins.toast.showShortBottom(data);
            }
          });
        }, function(err) {
          window.plugins.toast.showShortBottom("Could not get access token: " + err);
        });
      }
      else if (response.status === 'not_authorized') {
        window.plugins.toast.showShortBottom('您尚未授權本系統');
      } else {
        window.plugins.toast.showShortBottom('您尚未登入Facebook');
      }
    },
    function (error) {
      window.plugins.toast.showShortBottom(error);
    }
  );
}

function ShowMain() {
  $('#iframe').attr('src', "http://myth-hair.frog.tw/phonegap.php");
  localStorage.Version = version;
  if(localStorage.Account && localStorage.Password) {
    LoginSubmit('Login', false, "", localStorage.Account, localStorage.Password, "");
  } else if(localStorage.FacebookID)
    FBLoginSubmit('Login', false, '');
  
  $("#SplashScreen").fadeOut();
  $("#Div_Carousel").fadeOut();
  $("footer").fadeOut();
  $("#Page_Main").show();
}

function getPhoto(data) {
  var source;
  if(data.SourceType == "CAMERA") {
    source = Camera.PictureSourceType.CAMERA;
    cordova.plugins.diagnostic.requestRuntimePermissions(function(statuses){
    }, function(error){
      window.plugins.toast.showShortBottom(error);
    },[
      cordova.plugins.diagnostic.runtimePermission.CAMERA
    ]);
  } else if(data.SourceType == "PHOTOLIBRARY")
    source = Camera.PictureSourceType.PHOTOLIBRARY;
    
  navigator.camera.getPicture(
    function(imageURI) {
      var actualURL = imageURI;
      var options = new FileUploadOptions();
      options.fileKey = "Upload";
      options.fileName = "photo.jpg";
      options.mimeType = "image/jpeg";
      if(data.Role == "Activity")
        options.params = {OID: data.OID}
      else
        options.params = {Role: data.Role}

      window.plugins.spinnerDialog.show(null, null, true);
      var ft = new FileTransfer
      ft.onprogress = function(progressEvent) {
        if (progressEvent.lengthComputable) {
          $("#Modal_Progress").modal({backdrop: "static"});
          $("#Modal_Progress .progress-bar").css('width', (progressEvent.loaded / progressEvent.total * 100) + "%");
        } else {
          //$("#Modal_Progress .progress-bar").css('width', "100%");
        }
      };
      ft.upload(actualURL, encodeURI(data.Role == "Activity" ? "http://myth-hair.frog.tw/ajax_DMUpload.php" : "http://myth-hair.frog.tw/ajax_photoUpload.php"), 
        function(r) {
          window.cache.cleartemp();
          document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: 'onNewPicture', Role: data.Role}), 'http://myth-hair.frog.tw');
          window.plugins.spinnerDialog.hide();
          $("#Modal_Progress").modal('hide');
        }, 
        function(error) {
          window.plugins.toast.showShortBottom("上傳失敗: " + error.code);
          window.plugins.spinnerDialog.hide();
          $("#Modal_Progress").modal('hide');
        }, options
      );
    }, function(message) {
      window.plugins.toast.showShortBottom('已取消上傳');
    }, {
      quality: 90,
      sourceType: source,
      targetWidth: 1000,
      targetHeight: 1000,
      cameraDirection: Camera.Direction.FRONT
    }
  );
}