# Custome Code

## Requirement 1: Inplace code execution
So this is a rather significant update to application but I think it will add massive value to our platform. This is the start of the concept of the user being able to inject custom browser javascript to affect how the application behaves. So I will want you to have a look closely at what javascript viewer we are using for markdown and see how to extend it. 

Ok so I would like to adapt the code block feature. So if a user adds code block with the designator "wiki-code" the platform elecutes the javascript and put whatever string was returned into the html where the code block was meant to be. Sort of an example like this 

'''wiki-code
   function(){
     return "Hello World"
   }
'''

will display instead of the code block

Hello World.

## Requirement 2 access to files
This feture will be a game changer but relies on the previous feature. I would love you to create an documents array in the context of the window. This should be available to the user and will hold an array of files and folders avaiable to the user to interogte. The stucture would be

'''
  window.documents = [
   {
      name: "Folder 1", 
      type: "folder"
      created: "2025-01-02 13:00:00"
      path: "Folder 1"
      space: "1"
      icon: "bg-1 folder"
      children: [
        {
          name: "sample.md", 
          type: "file"
          created: "2025-01-02 13:00:00"
          path: "Folder 1/sample.md"
          space: "1"
          icon: "bg-1 file"
          children: []
        }
      ]
   }
  ]

'''

And for coolness have a folder array that is window.currentDocuments that has the detail of the folder the user is in

With this the user can inject code to show folders below it like follows

'''wiki-code
   function(){
    var docs;
     for (var i=0;i < window.currentDocuments.length; i++){
      docs += '<li>' window.currentDocuments[i].name + '</li>'
     }
     return docs
   }
'''
