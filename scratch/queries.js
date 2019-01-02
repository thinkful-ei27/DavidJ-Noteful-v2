'use strict';

const knex = require('../knex');

/*let searchTerm = 'gaga';
knex
  .select('notes.id', 'title', 'content')
  .from('notes')
  .modify(queryBuilder => {
    if (searchTerm) {
      queryBuilder.where('title', 'like', `%${searchTerm}%`);
    }
  })
  .orderBy('notes.id')
  .then(results => {
    console.log(JSON.stringify(results, null, 2));
  })
  .catch(err => {
    console.error(err);
  });

let id = 3
knex
  .select('notes.id', 'title', 'content')
  .from('notes')
  .modify(queryBuilder => {
      queryBuilder.where('notes.id', `${id}`);
    })
  .then(results => console.log(results[0]));


knex('notes')
  .update({title :'newTitle', content : 'New Content'})
  .modify(queryBuilder => {
    queryBuilder.where('notes.id', 3);
  })
  .returning(['notes.id', 'title'])
  .then( (results) => console.log(results[0]));
  

knex('notes')
  .insert({title: 'NEW FREAKING TITLE YYEEAAHHH', content: 'Some really boring content'})
  .returning(['notes.id', 'title', 'content'])
  .then( results => console.log(results));


knex('notes')
  .where({id: 11})
  .returning('notes.id')
  .del()
  .then( results => console.log(`You deleted ${results}!`));
*/