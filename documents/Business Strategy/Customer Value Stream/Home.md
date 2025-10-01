# Home
---
#####  Projects
---
```dataview
List from "Projects"  where contains(area,this.file.name)
```

#####  Tasks
---
```dataviewjs 
	let parentFolder = dv.current().file.folder + "/Tasks" 
		
	const lsFolder = app.vault.getFiles() 
		.filter(file => file.parent.path == parentFolder ) 
		.map(file => dv.fileLink(file.path)) 
		.sort()
		dv.list(lsFolder) 
```
- What are the rationalise landscape targets for this value stream?
- Area Customer, ecommerce, FinTech, POS (Adrian and Debbie)
##### Deliverables
---
```dataviewjs 
	let parentFolder = dv.current().file.folder + "/Deliverables" 
		
	const lsFolder = app.vault.getFiles() 
		.filter(file => file.parent.path == parentFolder ) 
		.map(file => dv.fileLink(file.path)) 
		dv.list(lsFolder) 
```
##### Resources
---
```dataviewjs 
	let parentFolder = dv.current().file.folder + "/Resources" 
		
	const lsFolder = app.vault.getFiles() 
		.filter(file => file.parent.path == parentFolder ) 
		.map(file => dv.fileLink(file.path)) 
		dv.list(lsFolder) 
```