var app = {
  initialize: function() {
    this.bindEvents();
  },
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  onDeviceReady: function() {
    var push = PushNotification.init({
      "android": {"senderID": "100971030124", "icon": "icon", "forceShow": "true"},
      "ios": {"alert": "true", "badge": "true", "sound": "true"}, 
      "windows": {}
    });
    push.on('registration', function(data) {
      localStorage.RegistrationID = data.registrationId;
      $("input[name=RegistrationID]").val(data.registrationId);
      if(localStorage.Account && localStorage.Password) {
        $("#Account").val(localStorage.Account);
        $("#Password").val(localStorage.Password);
        LoginSubmit('Login');
      } else if(localStorage.FacebookID)
        FBLoginSubmit('Login');
    }).on('notification', function(data) {
    }).on('error', function(e) {
      console.log("push error");
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
      case "onBarcodeScan":
        cordova.plugins.barcodeScanner.scan(
          function(result) {
            if(result.format == "QR_CODE")
              document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onBarcodeScan", Type: data.Type, Result: result.text}), 'http://myth-hair.frog.tw');
          }, 
          function(error) {
            window.plugins.toast.showShortBottom("Scanning failed: " + error);
          }
        );
        break;
      case "onReLogin":
        window.plugins.spinnerDialog.show(null, null, true);
        
        alert(localStorage.Account);
        alert(localStorage.Password);
        alert(localStorage.FacebookID);
        alert(localStorage.RegistrationID);
        if(localStorage.Account && localStorage.Password) {
          alert("LoginSubmit('Login');");
          LoginSubmit('Login');
        } else if(localStorage.FacebookID) {
          alert("FBLoginSubmit('Login', '');");
          FBLoginSubmit('Login', '');
        }
          
        /*window.plugins.spinnerDialog.hide();
        if(success)
          document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onReLogin", Action: data.Action}), 'http://myth-hair.frog.tw');
        else
          window.location = "./index.html";*/
        break;
      case "onLogout":
        localStorage.removeItem("Account");
        localStorage.removeItem("Password");
        localStorage.removeItem("FacebookID");
        localStorage.removeItem("RegistrationID");
        $("#Page_Main").fadeOut();
        $("#Page_Login").fadeIn();
        //window.location = "./index.html";
        break;
      case "onFBConnect":
        alert("ASDF");
        alert(FBLoginSubmit('Connect', data.Role));
        //if(FBLoginSubmit('Connect', data.Role)) {
          document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onFBConnect", Role: data.Role}), 'http://myth-hair.frog.tw');
        //}
        break;
      case "onFBOpen":
        window.open('fb://' + data.URL, '_system', 'location=no');
        break;
      case "onNewPicture":
        getPhoto(data);
        break;
      }
    }, false);
  }
};
app.initialize();

var backbutton = false;
function onBackKeyDown() {
  if(backbutton)
    (navigator.app && navigator.app.exitApp()) || (device && device.exitApp());
  else
    document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onBackKeyDown"}), 'http://myth-hair.frog.tw');
}

function LoginSubmit(Type) {
  $.post('http://myth-hair.frog.tw/login.php', $("#Form_" + Type).serialize(), function(data, status){
    if(status == "success" && data == "OK") {
      localStorage.Account = $("#Account").val();
      localStorage.Password = $("#Password").val();
      localStorage.removeItem("FacebookID");
      $("#Page_Login").fadeOut();
      $("#Page_Main").fadeIn();
      //window.location = "./main.html";
      return true;
    } else
      $("#Alert_" + Type).html(data);
  });
  return false;
}

function FBLoginSubmit(Type) {
  facebookConnectPlugin.login(["public_profile", "email"],
    function (response) {
      if (response.status === 'connected') {
        facebookConnectPlugin.getAccessToken(function(token) {
          $("input[name=AccessToken]").val(token);
          $.post('http://myth-hair.frog.tw/loginFB.php', $("#Form_" + Type).serialize(), function(data, status){
            if(status == "success" && data == "OK") {
              localStorage.FacebookID = response.authResponse.userID;
              localStorage.removeItem("Account");
              localStorage.removeItem("Password");
              $("#Page_Login").fadeOut();
              $("#Page_Main").fadeIn();
              //window.location = "./main.html";
              return true;
            } else
              $("#Alert_" + Type).html(data);
          });
        }, function(err) {
            alert("Could not get access token: " + err);
        });
      }
      else if (response.status === 'not_authorized')
        $("#Alert_" + Type).html('<div class="alert alert-danger fade in"><strong>使用 Facebook 登入失敗!</strong> 您尚未授權本系統。</div>');
      else
        $("#Alert_" + Type).html('<div class="alert alert-danger fade in"><strong>使用 Facebook 登入失敗!</strong> 您尚未登入Facebook。</div>');
    },
    function (error) {
      alert(error);
    }
  );
  return false;
}

function getPhoto(data) {
  var source;
  if(data.SourceType == "CAMERA")
    source = Camera.PictureSourceType.CAMERA;
  else if(data.SourceType == "PHOTOLIBRARY")
    source = Camera.PictureSourceType.PHOTOLIBRARY;
    
  navigator.camera.getPicture(
    function(imageURI) {
      var actualURL = imageURI;
      if (imageURI.startsWith("content://")) {
        window.FilePath.resolveNativePath(imageURI, function(localFileUri) {
          actualURL = "file://" + localFileUri;
          window.resolveLocalFileSystemURL("file://" + localFileUri, function(fileEntry) {
          actualURL = fileEntry.toURL();
          });
        });
      }
      var options = new FileUploadOptions();
      options.fileKey = "Upload";
      options.fileName = "photo.jpg";
      options.mimeType = "image/jpeg";
      if(data.Role == "Activity")
        options.params = {OID: data.OID}
      else
        options.params = {Role: data.Role}

      window.plugins.spinnerDialog.show(null, null, true);
      var ft = new FileTransfer();
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