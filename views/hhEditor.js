'use strict';
var Scope;
var activate_file;
var Editor;
angular.module('hhUI', ['ui.sortable', 'firebase'])

  .directive('hhEditor', ['$firebase', function ($firebase) {
    return {
      restrict:'A E',
      replace: true,
      scope: {
        settings:'=settings',
      },
      template: '<div class=hhEditor><div class=tabs><div id=sortable-container class=rowTabs as-sortable=sortableOptions ng-model=tabs><div ng-repeat="(key, item) in tabs" ng-click="clicked($event, key)" ng-class="{tabActive: tabStatus.focus == key}" as-sortable-item="" class=tab><div ng-show="editing != key" as-sortable-item-handle="" class=tabTitle>{{item.title | titleDefault}}{{item.syntax.ext}}</div><input show-focus="editing == key" ng-show="editing == key" ng-blur=hide(key) ng-enter=hide(key) ng-model="tabsData[item[\'$id\']].title" class=tabTitleRename> <strong ng-hide=settings.readOnly ng-click="close($event, key)" class=tabClose>x</strong></div><div ng-hide=settings.readOnly class="tab addNew" ng-click=add()>+</div></div></div><div class=tabsContents><div ng-repeat="(key, item) in tabs" class=tabContent ng-class="{active: tabStatus.focus == key}"><div class=editor><div hh-firepad="" tabeditor=item settings=settings class=aceEditor></div></div><div class=editorStatus><div class=editorStatusContent><a class=download ng-click=downloadAll()>&#8582;</a><div class=cursor>Line {{item.row || "1"}}, Column {{item.column || "1"}}</div><div class=syntax>Syntax:<select ng-model=item.syntax ng-change=syntax(key) ng-options="mode.name for mode in modes track by mode.name"></select></div></div></div></div></div></div>',
      controller: ['$scope', function($scope){
        Scope = $scope;
        // Base settings
        var settings = {
          firebase: false,
          syntax: $scope.settings.syntax || 'VHDL',
          readOnly: $scope.settings.readOnly || false,
          initialName: $scope.settings.initialName,
          initialText: $scope.settings.initialText || '',
        }
        settings.initialSyntax = $scope.settings.initialSyntax || settings.syntax

        // Supported Ace syntax mode's
        $scope.modes = [
          { name: 'VHDL', mode: 'ace/mode/vhdl', ext:''},
          { name: 'JavaScript', mode: 'ace/mode/javascript', ext:'.js'},
          { name: 'HTML', mode:"ace/mode/html", ext:'.html' },
          { name: 'PHP', mode:"ace/mode/php", ext:'.php' },
          { name: 'C', mode:"ace/mode/c_cpp", ext:'.c' },
          { name: 'C++', mode:"ace/mode/c_cpp", ext:'.cc' },
          { name: 'Java', mode:"ace/mode/java", ext:'.java' },
          { name: 'C#', mode:"ace/mode/csharp", ext:'.cs' },
          { name: 'Scala', mode:"ace/mode/scala", ext:'.scala' },
          { name: 'CoffeeScript', mode:"ace/mode/coffee", ext:'.coffee' },
          { name: 'CSS', mode:"ace/mode/css", ext:'.css' },
          { name: 'GO', mode:"ace/mode/golang", ext:'.go' },
          { name: 'HAML', mode:"ace/mode/haml", ext:'.haml' },
          { name: 'Haskell', mode:"ace/mode/haskell", ext:'.hs' },
          { name: 'Jade', mode:"ace/mode/jade", ext:'.jade' },
          { name: 'JSON', mode:"ace/mode/json", ext:'.json' },
          { name: 'LESS', mode:"ace/mode/less", ext:'.less' },
          { name: 'Python', mode:"ace/mode/python", ext:'.py' },
          { name: 'Cython', mode:"ace/mode/python", ext:'.py' },
          { name: 'Ruby', mode:"ace/mode/ruby", ext:'.rb' },
          { name: 'Sass', mode:"ace/mode/sass", ext:'.sass' },
          { name: 'SCSS', mode:"ace/mode/scss", ext:'.scss' },
          { name: 'XML', mode:"ace/mode/xml", ext:'.xml' },
          { name: 'YAML', mode:"ace/mode/yaml", ext:'.yaml' },
          { name: 'LUA', mode:"ace/mode/lua", ext:'.lua' },
          { name: 'Markdown', mode:"ace/mode/ruby", ext:'.md' },
          { name: 'Matlab', mode:"ace/mode/matlab", ext:'.m' },
          { name: 'Objective-C', mode:"ace/mode/objectivec", ext:'.m' },
          { name: 'PERL', mode:"ace/mode/perl", ext:'.pl' },
          { name: 'SQL', mode:"ace/mode/sql", ext:'.sql' },
          { name: 'SVG', mode:"ace/mode/svg", ext:'.svg' },
          { name: 'Text', mode:"ace/mode/text", ext:'.txt' },
        ];

        $scope.getSyntax = function(name){
          var result = $scope.modes[0];
          angular.forEach($scope.modes, function(value, key) {
            if (value.name == name)
              result = value
          });
          return result;
        }

        $scope.editing = null;

        // Get default mode for new tabs
        settings.syntaxMode = $scope.getSyntax(settings.syntax);
        settings.initialSyntaxMode = $scope.getSyntax(settings.initialSyntax);

        $scope.hide = function(key){
          $scope.editing = null;
          //console.log("in hide");
          $scope.tabs[key].file = activate_file;
          $scope.focus(key);
        }

        $scope.clicked = function(event, key){
          //console.log("clicked");
          if (event.which == 2)
            return $scope.close(event, key);

          if (key == $scope.tabStatus.focus)
          {
            if (settings.readOnly)
              return
            $scope.editing = key;
          }
          else
            $scope.focus(key)
        }

        $scope.downloadAll = function () {
          angular.forEach($scope.tabs, function(value, key) {
            var title = (value.title || "Untitled")+''+value.syntax.ext
            var content = window.aces[value.id].getSession().getValue();
            $scope.download(title, content)
          });
        }

        $scope.download = function (filename, text) {
          var pom = document.createElement('a');
          pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
          pom.setAttribute('download', filename);
          document.body.appendChild(pom)
          pom.click();
          document.body.removeChild(pom)
        }

        $scope.syntax = function(key, syntax){
          if (settings.readOnly)
            return

          var currentItem = $scope.tabs[key];
          $scope.tabs.$save(currentItem);
        }

        $scope.focus = function(focus){
          $scope.tabStatus.focus =  focus;
          $scope.tabStatus.$save();
          if ($scope.tabs[focus]) {
            activate_file = $scope.tabs[focus].file;
            console.log("in focus");
            console.log(activate_file);
            window.aces[$scope.tabs[focus].id].focus();
          }
        }

        $scope.setText = function(index, value){
          // Timeout to prevent iget errors with ng
          if ($scope.tabs[index])
            setTimeout(function(){
              window.aces[$scope.tabs[index].id].setValue(value);
              // window.aces[$scope.tabs[index].id].insert(value);
            })
        }        

        $scope.close = function($event, tabId){
          if ($event)
            $event.stopPropagation();

          if (settings.readOnly)
            return

          if (tabId <= $scope.tabs.length-2)
            $scope.focus(tabId)
          else
            $scope.focus($scope.tabs.length-2)

          $scope.tabs.$remove(tabId);
        }
        $scope.getWindow = function() {
          Editor = window.aces;
          console.log(Editor);
        }
        $scope.add = function(syntax, content, title){
          var syntax = syntax || settings.syntaxMode
          var content = content || ''

          $scope.tabStatus.total = ($scope.tabStatus.total) ? $scope.tabStatus.total+1 : 1;
          $scope.tabStatus.$save();
          var newTitle;
          if (title) {
            newTitle= title;
          }
          else {
            newTitle = 'New file'+ $scope.tabStatus.total;
            activate_file = {};
            activate_file.name = newTitle;
            activate_file.type = "file";
            activate_file.path = "";
          }

          var x = $scope.tabs.$add({id: $scope.tabStatus.total, title: newTitle, syntax: syntax, "$priority":9999,file:activate_file}).then(function(ref){
            
            var newTabIndex = $scope.tabs.length-1

            if (content != '')
              $scope.setText(newTabIndex, content )

            $scope.tabs[newTabIndex].file = activate_file;
            $scope.focus(newTabIndex);
          });
        }  

        // Initialize firebase connection
        var ref = new Firebase($scope.settings.firebase);
        $scope.tabStatus = $firebase(ref.child('status')).$asObject();
        $scope.tabs = $firebase(ref.child('tabs')).$asArray();
        
        //var xxx = $firebase(ref.child('tabs')).$asObject();
        $firebase(ref.child('tabs')).$asObject().$bindTo($scope, "tabsData");
        //强制设定只打开初始文件
        $scope.tabs.$loaded(function(){
          $scope.tabs.length = 0;
          // activate_file = {};
          // activate_file.name = "initial file";
          // activate_file.type = "file";
          // activate_file.path = "";
          // if ($scope.tabs.length == 0)
          //   $scope.add(settings.initialSyntaxMode, settings.initialText, "initial file");
        });

        $scope.sortableOptions = {
          containment: '#sortable-container',
          //restrict move across columns. move only within column.
          accept: function (sourceItemHandleScope, destSortableScope) {
            if (settings.readOnly == true)
              return false

            return sourceItemHandleScope.itemScope.sortableScope.$id === destSortableScope.$id;
          },
          orderChanged: function(diff){
            for (var i = 0; i < $scope.tabs.length; i++) {
              var currentItem = $scope.tabs[i];

              if (currentItem.$priority != i)
              {
                currentItem.$priority = i;
                $scope.tabs.$save(currentItem);
              }
            }
            $scope.focus(diff.dest.index);
          }
        }
      }]
    }
  }])

  .directive('hhFirepad', [function() {

    return {
      restrict: 'A',
      scope: {
        tabeditor: '=',
        settings: '='
      },
      link: function($scope, element, attrs) {
        Editor = $scope;
        var settings = {
          theme: $scope.settings.theme || "ace/theme/monokai",
          syntax: $scope.settings.editorSyntax || "ace/mode/javascript",
          readOnly: $scope.settings.readOnly || false
        }

        window.aces = window.aces || {}

        var firepadDiv = element[0];
        var firepadRef = new Firebase($scope.settings.firebase).child("firepad/"+$scope.tabeditor.id);

        editor =  window.aces[$scope.tabeditor.id] = ace.edit(element[0]);

        editor_setting(editor);

        $scope.$watch('tabeditor.syntax', function(){
          if ($scope.tabeditor.syntax)
            editor.getSession().setMode($scope.tabeditor.syntax.mode);       
        })

        // Track cursor position (for status bar)
        editor.selection.on("changeCursor", function() {
          $scope.$apply(function () {
            $scope.tabeditor.row = editor.selection.lead.row+1
            $scope.tabeditor.column = editor.selection.lead.column+1
          });
        });
      }
    }

  }])

.directive('showFocus', ['$timeout', function($timeout) {
  return function(scope, element, attrs) {
    scope.$watch(attrs.showFocus, 
      function (newValue) { 
        $timeout(function() {
            newValue && element[0].focus();
        });
      },true);
  };    
}])

.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
 
                event.preventDefault();
            }
        });
    };
})

.filter('titleDefault', function() {
  return function(input) {
    return input ? input : 'Untitled';
  };
});