angular.module('dashboard.directives.ModelFieldImage', [
  "dashboard.services.GeneralModel",
  "ngSanitize"
])

.directive('modelFieldVideoView', function($compile) {
  return {
    restrict: 'E',
    template: '<b>{{ field.label }}</b>: {{ data[field.name] }}',
    scope: {
      field: '=options',
      data: '=ngModel'
    },
    link: function(scope, element, attrs) {

    }
  };
})

.directive('modelFieldVideoEdit', function($compile, $document, GeneralModelService, SessionService, $sce, $http) {
  return {
    restrict: 'E',
    template: '<div class="image-container" ng-file-drop="onFileSelect($files)" ng-click="videoClick()"><video ng-if="videoUrl" width="auto" height="400px" ng-src="{{ videoUrl }}" controls>Your browser does not support the video tag.</video></div> \
      <div class="button-menu show-menu">\
      <button class="btn btn-default clear-button" ng-show="uploadedVideoUrl && !disabled" ng-click="clear()">Clear</button> \
      </div> \
      <div ng-file-drop="onFileSelect($files)" ng-show="dropSupported && !disabled" class="image-drop">{{ uploadStatus }}</div> \
      <div ng-file-drop-available="dropSupported=true" ng-show="!dropSupported">HTML5 Drop File is not supported!</div> \
      <input type="file" ng-file-select="onFileSelect($files)" ng-hide="disabled"> \
      <!--<button ng-click="upload.abort()" class="cancel-button">Cancel Upload</button>-->',
    scope: {
      key: "=key",
      options: '=options',
      disabled: '=disabled',
      data: '=ngModel',
      modelData: '=modelData'
    },
    link: function(scope, element, attrs) {
        var selectedFile = null;

        scope.uploadStatus = "Browse for or drop video file";

        //Handle invalid/broken video urls
        scope.$watch('currentVideoUrl',function(newVal,oldVal){
          if(newVal!=oldVal) {
            $http.get(scope.videoUrl)
              .then
              (
                null,
                function(e){
                  alert('Invalid video at ' + scope.videoUrl);
                  scope.videoUrl = null;
                }
              )
            scope.videoUrl = newVal ? newVal : scope.currentVideoUrl;
          }
        });

        scope.$watch('uploadedVideoUrl',function(newVal,oldVal){
          if(newVal!=oldVal) {
            scope.videoUrl = newVal ? newVal : scope.currentVideoUrl;
          }
        });

        var trustUrl = function(value)
        {
          return $sce.trustAsResourceUrl(value);
        }

        /**
         * scope.data updates async from controller so need to watch for the first change only
         */
        var unwatch = scope.$watch('data', function(data) {
          if (data) { 
            unwatch(); //Remove the watch
            if (!scope.options || !scope.options.model) {
              //Not a Table reference (the field contains the image URL)
              if (typeof data === "string") {
                scope.currentVideoUrl = scope.videoUrl = trustUrl(data);
              } else if (typeof data === "object") {
                if (data.fileUrl) scope.currentVideoUrl = scope.videoUrl = trustUrl(data.fileUrl);
                if (data.videoUrl) scope.currentVideoUrl = scope.videoUrl = trustUrl(data.videoUrl);
              }
            } else {
              //Media table reference (data is the ID reference)
              GeneralModelService.get(scope.options.model, data)
              .then(function(response) {
                if (!response) return;  //in case http request was cancelled
                //scope.options.urlKey defines the column field name for where the URL of the image is stored
                scope.currentVideoUrl = trustUrl(response[scope.options.urlKey]);
              });
              
            }
            
          }
       });

        //Use the FileReader to display a preview of the image before uploading
        var fileReader = new FileReader();
        fileReader.onload = function (event) {
          //Set the preview image via scope.imageUrl binding
          scope.uploadedVideoUrl = trustUrl(event.target.result);
          scope.$apply();
        };
        fileReader.onerror = function(error) {
          console.log(error);
        };

        scope.clear = function() {
          //Clear out an existing selected image
          scope.data = null; //null out the data field
          if (scope.modelData.__ModelFieldVideoData && scope.modelData.__ModelFieldVideoData[scope.key]) {
            //make sure to remove any pending image uploads for this image field
            delete scope.modelData.__ModelFieldVideoData[scope.key];
          }
          delete scope.uploadedVideoUrl; //remove the preview video
        };
        
        scope.onFileSelect = function($files) {

          //$files: an array of files selected, each file has name, size, and type.
          if ($files.length < 1) return;
          selectedFile = $files[0];
          var s3Path = scope.options.path; //S3 path needed when getting S3 Credentials for validation;
          
          //bind back to parent scope's __ModelFieldImageData object with info on selected file
          if (!scope.modelData.__ModelFieldVideoData) scope.modelData.__ModelFieldVideoData = {};
          if (scope.options && scope.options.urlKey) {
            //When field options involve a reference table use model key and urlKey as reference 
            if (!scope.modelData.__ModelFieldVideoData[scope.key]) scope.modelData.__ModelFieldVideoData[scope.key] = {};
            scope.modelData.__ModelFieldVideoData[scope.key][scope.options.urlKey] = {path: s3Path, file: selectedFile};
          } else {
            //No table reference (file URL assigned directly into current model's field)
            scope.modelData.__ModelFieldVideoData[scope.key] = {path: s3Path, filename: scope.options.filename, file: selectedFile};
          }
          console.log(scope.modelData.__ModelFieldVideoData[scope.key])
          //Load the Preview before uploading
          fileReader.readAsDataURL(selectedFile);

        };

        //Prevent accidental file drop
        $document.on("drop", function(event) {
          if (event.target.nodeName != "INPUT") {
            event.preventDefault();
          } 
        });

        $document.on("dragover", function( event ) {
          event.preventDefault();
          //Show Drop Target
          element.find(".image-drop").addClass("show-upload");
          element.find(".input[type=file]").addClass("show-upload");
          element.find(".button-menu").addClass("hide-menu");
        });

        $(window).on("mouseleave", function() {
          //Hide Drop Target
          element.find(".image-drop").removeClass("show-upload");
          element.find(".input[type=file]").removeClass("show-upload");
          element.find(".button-menu").removeClass("hide-menu");
        });

        scope.$on('$destroy', function() {
          //event clean up
          $document.off("drop");
          $document.off("dragover");
          $(window).off("mouseleave");
        });


    }
  };
})

;
