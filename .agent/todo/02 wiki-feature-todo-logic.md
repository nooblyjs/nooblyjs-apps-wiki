# Todo feature

## Background: Create context layout
So I would like to make a cool feature regarding the TODO (" -[x]") concept in markdown. I would like to break this down into two features. The ability to mark something as done and it updates the markdown and secondarily to be able to find all the TODO's accross all markdown files and be able to display them using our  "WIKI-CODE" concept.

## Feature 1: Todo updates 
Ok, so when the markdown is in the view content area, the user should be able to click on a todo check box and it should become checked. But as this needs to update the underlying markdown file, it would be great if we could unobtrusevly upate the underlying file. Note that this should raise an event to the document change event so that the search index runs and a window.todo context can be updated.  

## Feature 2: Client side todo object for "wiki-code" 
 I would love a feature like the window.documents object that can be used by the wiki-code blocks But in this case it should be for Todo items. A periodic client side activity should walk through the folders and files and check for any files, with todo markdown, that have been updated since the last check and create a js object called window.todos that holds the todo items. 
 
This object could look like this:

window.todos[
    {
        created: "2025-10-09T08:28:13.114Z"
        created: "2025-10-09T08:28:13.114Z"
        name: "markdown-guide.md"
        path: "Getting Started/markdown-guide.md",
        space: "1",
        todos: [
            {
                text: "Update this file",
                status: unchecked,
                line: 35
            },
            {
                text: "Update this item",
                status: checked
                line: 36
            }
        ]
        children : [{

            ... child files
        }]
    },
]

The one key think here is that if I click on a checkbox where this has been presented then it should find the underling markdown file and update the check value from "[ ]" to "[x]" and if checked "[x]" to "[ ]".