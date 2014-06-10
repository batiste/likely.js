'use strict';

var container = document.getElementById('todoapp'),
	tpl = likely.Template(document.getElementById('tpl').innerHTML), // building the template object
	ENTER_KEY = 13,
	ESCAPE_KEY = 27;

// the data structure contains the data (items) as well
// as all well as the data manipulation and HTML helpers
var data = {
	items: [],
	newItem:'',
	filter: 'all',
	editItem: null,
	add:function(event){
		if(event.which === ENTER_KEY && data.newItem) {
			data.items.push({text:data.newItem, complete:false});
			data.newItem = '';
			binding.update();
		}
	},
	destroy: function(index){
		data.items.splice(index, 1);
		binding.update();
	},
	edit: function(item, index) {
		data.editItem = item;
		binding.update();
		document.getElementById('edit-'+index).focus();
	},
	editKeydown: function(event, item, index) {
		// remove the item if the text is empty
		if(event.which === ENTER_KEY || event.which === ESCAPE_KEY) {
			data.editItem = null;
			if(!likely.util.trim(item.text)) {
				data.items.splice(index, 1);
			}
			binding.update();
		}
	},
	switchState: function(item) {
		item.complete = !item.complete;
		binding.update();
	},
	itemClass: function(item) {
		var cls = [];
		if (item.complete) {
			cls.push('complete');
		}
		if (data.editItem === item) {
			cls.push('editing');
		}
		return cls.join(' ');
	},
	toggleAll: function(event) {
		var target = event.target;
		data.items.map(function(el){ el.complete = target.checked; });
		binding.update();
	},
	setFilter: function(value) {
		data.filter = value;
		binding.update();
	},
	isVisible: function(item) {
		if(data.filter === 'all') {
			return true;
		}
		if(data.filter === 'complete' && item.complete) {
			return true;
		}
		if(data.filter === 'active' && !item.complete) {
			return true;
		}
		return false;
	},
	itemsLeft: function() {
		return data.items.filter(function(e){return !e.complete;}).length;
	},
	itemsCompleted: function() {
		return data.items.filter(function(e){return e.complete;}).length;
	},
	clearCompleted: function() {
		data.items = data.items.filter(function(e){return !e.complete;});
		binding.update();
	}
};

// create the binding between the DOM, the template, and the data
var binding = likely.Binding(container, tpl, data);
binding.init();
