var app = {
  initialize: function() {
    this.bindEvents();
  },
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },
  onDeviceReady: function() {
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
        if(localStorage.Account && localStorage.Password)
          LoginSubmit('Login', data.Action);
        else if(localStorage.FacebookID)
          FBLoginSubmit('Login', data.Action, '');
        break;
      case "onLogout":
        localStorage.removeItem("Account");
        localStorage.removeItem("Password");
        localStorage.removeItem("FacebookID");
        $("#Cover").fadeIn(function(){
          $("#Page_Main").hide();
          $("#Page_Login").show();
          $("#Cover").fadeOut();
        });
        break;
      case "onFBConnect":
        FBLoginSubmit('Connect', data.Role + '_profiles', data.Role);
        break;
      case "onFBOpen":
        window.open('fb://' + data.URL, '_system', 'location=no');
        break;
      case "onNewPicture":
        getPhoto(data);
        break;
      }
    }, false);
    
    var push = PushNotification.init({
      "android": {"senderID": "100971030124", "icon": "notification", "forceShow": "true"},
      "ios": {"alert": "true", "badge": "true", "sound": "true"}, 
      "windows": {}
    });
    push.on('registration', function(data) {
      localStorage.RegistrationID = data.registrationId;
      $("input[name=RegistrationID]").val(data.registrationId);
      if(localStorage.Account && localStorage.Password) {
        $("#Account").val(localStorage.Account);
        $("#Password").val(localStorage.Password);
        LoginSubmit('Login', false);
      } else if(localStorage.FacebookID)
        FBLoginSubmit('Login', false, '');
      else
        $("#Cover").fadeOut();
    }).on('notification', function(data) {
    }).on('error', function(e) {
      console.log("push error");
    });
  }
};
app.initialize();

$(document).ready(function(){
  $("#iframe").height($(window).height());
  $('#Form_Register').validator().on('submit', function (e) {
    if (!e.isDefaultPrevented())
      LoginSubmit('Register', false);
    return false;
  })
  $('#Form_Login').validator().on('submit', function (e) {
    if (!e.isDefaultPrevented())
      LoginSubmit('Login', false);
    return false;
  })
});

var backbutton = false;
function onBackKeyDown() {
  if(backbutton)
    (navigator.app && navigator.app.exitApp()) || (device && device.exitApp());
  else
    document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onBackKeyDown"}), 'http://myth-hair.frog.tw');
}

function LoginSubmit(Type, Action) {
  window.plugins.spinnerDialog.show(null, null, true);
  $.post('http://myth-hair.frog.tw/login.php', $("#Form_" + Type).serialize(), function(data, status){
    if(status == "success" && data == "OK") {
      localStorage.Account = $("#Account").val();
      localStorage.Password = $("#Password").val();
      localStorage.removeItem("FacebookID");
      if(Action)
        document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onRedirect", Action: Action}), 'http://myth-hair.frog.tw');
      else
        document.getElementById('iframe').contentWindow.location.reload(true);
      $("#Page_Login").hide();
      $("#Page_Main").show();
      $("#Cover").fadeOut();
    } else {
      window.plugins.toast.showShortBottom(data);
      $("#Page_Main").hide();
      $("#Page_Login").show();
      $("#Cover").fadeOut();
    }
  });
  window.plugins.spinnerDialog.hide();
}

function FBLoginSubmit(Type, Action, Role) {
  facebookConnectPlugin.login(["public_profile", "email"],
    function (response) {
      if (response.status === 'connected') {
        facebookConnectPlugin.getAccessToken(function(token) {
          $("input[name=AccessToken]").val(token);
          $.post('http://myth-hair.frog.tw/loginFB.php', {Type: Type, Role: Role, AccessToken: token, RegistrationID: localStorage.RegistrationID}, function(data, status){
            if(status == "success" && data == "OK") {
              localStorage.FacebookID = response.authResponse.userID;
              localStorage.removeItem("Account");
              localStorage.removeItem("Password");
              if(Action)
                document.getElementById('iframe').contentWindow.postMessage(JSON.stringify({Title: "onRedirect", Action: Action}), 'http://myth-hair.frog.tw');
              else
                document.getElementById('iframe').contentWindow.location.reload(true);
              $("#Page_Login").hide();
              $("#Page_Main").show();
              $("#Cover").fadeOut();
              return;
            } else {
              window.plugins.toast.showShortBottom(data);
              $("#Page_Main").hide();
              $("#Page_Login").show();
              $("#Cover").fadeOut();
            }
          });
        }, function(err) {
            window.plugins.toast.showShortBottom("Could not get access token: " + err);
            $("#Page_Main").hide();
            $("#Page_Login").show();
            $("#Cover").fadeOut();
        });
      }
      else if (response.status === 'not_authorized') {
        window.plugins.toast.showShortBottom('您尚未授權本系統');
        $("#Page_Main").hide();
        $("#Page_Login").show();
        $("#Cover").fadeOut();
      } else {
        window.plugins.toast.showShortBottom('您尚未登入Facebook');
        $("#Page_Main").hide();
        $("#Page_Login").show();
        $("#Cover").fadeOut();
      }
    },
    function (error) {
      window.plugins.toast.showShortBottom(error);
      $("#Page_Main").hide();
      $("#Page_Login").show();
      $("#Cover").fadeOut();
    }
  );
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