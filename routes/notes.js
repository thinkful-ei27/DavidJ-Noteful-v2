'use strict';

const express = require('express');

// Create an router instance (aka "mini-app")
const router = express.Router();

// TEMP: Simple In-Memory Database
//const data = require('../db/notes');
//const simDB = require('../db/simDB');
//const notes = simDB.initialize(data);

const knex = require ('../knex')

const hydrateNotes = require('../utils/hydrateNotes');

// Get All (and search by query)
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const folderId = req.query.folderId

  knex.select('notes.id', 'title', 'content', 'folders.id as folderId', 'folders.name as folderName', 'notes_tags as noteTag', 'tags')
    .from('notes')
    .leftJoin('folders', 'notes.folder_id', 'folders.id')
    .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
    .leftJoin('tags', 'notes_tags.tag_id', 'tags.id')
    .modify(function (queryBuilder) {
      if (searchTerm) {
        queryBuilder.where('title', 'like', `%${searchTerm}%`);
      }
    })
    .modify(function (queryBuilder) {
      if (folderId) {
        queryBuilder.where('folder_id', folderId);
      }
    })
    .orderBy('notes.id')
    .then(results => {
      const hydrated = hydrateNotes(results);
      res.json(hydrated);
    })
    .catch(err => {
      next(err);
    });
});

// Get a single item
router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  const folderId = req.query.folderId;
  const tagId = req.query.tagId;

  knex
  .select('notes.id', 'title', 'content', 'folders.id as folderId', 'folders.name as folderName')
  .from('notes')
  .leftJoin('folders', 'notes.folder_id', 'folders.id')
  .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
  .leftJoin('tags', 'notes_tags.tag_id', 'tags.id')
  .modify(queryBuilder => {
    queryBuilder.where('notes.id', `${id}`);
  })
  .modify(function (queryBuilder) {
    if (folderId) {
      queryBuilder.where('folder_id', folderId);
    }
  })
  .modify(function (queryBuilder) {
    if (tagId) {
      queryBuilder.where('tag_id', tagId);
    }
  })
  .then( (results) => {
    const hydrated = hydrateNotes(results);
    res.json(hydrated);
  })
  .catch(err => {
    next(err);
  });

});

// Put update an item
router.put('/:id', (req, res, next) => {
  const id = req.params.id;
  const { title, content, folderId, tags} = req.body;
  /***** Never trust users - validate input *****/
  const updateObj = {};
  const updateableFields = ['title', 'content', 'folderId'];
  

  updateableFields.forEach(field => {
    if (field in req.body) {
      updateObj[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!updateObj.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  knex('notes')
  .update({title :`${updateObj.title}`, content : `${updateObj.content}`, folder_id: `${updateObj.folderId}`})
  .where('notes.id', id)
  .returning(['id'])
    .then((ID)=> {
      return knex
      .delete()
      .from('notes_tags')
      .where('note_id', id);
    })
    .then(() => {
      // Insert related tags into notes_tags table
      const tagsInsert = tags.map(tagId => ({ note_id: id, tag_id: tagId }));
      console.log(tagsInsert);
      return knex.insert(tagsInsert).into('notes_tags');
    })
    .then(() => {
      // Select the new note and leftJoin on folders and tags
      return knex.select('notes.id', 'title', 'content',
        'folders.id as folder_id', 'folders.name as folderName',
        'tags.id as tagId', 'tags.name as tagName')
        .from('notes')
        .leftJoin('folders', 'notes.folder_id', 'folders.id')
        .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
        .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
        .where('notes.id', id);
    })
    .then(result => {
      if (result) {
        // Hydrate the results
        const hydrated = hydrateNotes(result)[0];
        // Respond with a location header, a 201 status and a note object
        res.location(`${req.originalUrl}/${hydrated.id}`).status(201).json(hydrated);
      } else {
        next();
      }
    })
    .catch(err => next(err));
  });



// Post (insert) an item
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags} = req.body;

  const newItem = {
    title: title,
    content: content,
    folder_id: folderId,
  };
  
  if (!newItem.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }
  let noteId;
  console.log(tags);
  knex.insert(newItem).into('notes').returning('id')
  .then(([id]) => {
    // Insert related tags into notes_tags table
    noteId = id;
    const tagsInsert = tags.map(tagId => ({ note_id: noteId, tag_id: tagId }));
    console.log(tagsInsert);
    return knex.insert(tagsInsert).into('notes_tags');
  })
  .then(() => {
    // Select the new note and leftJoin on folders and tags
    return knex.select('notes.id', 'title', 'content',
      'folders.id as folder_id', 'folders.name as folderName',
      'tags.id as tagId', 'tags.name as tagName')
      .from('notes')
      .leftJoin('folders', 'notes.folder_id', 'folders.id')
      .leftJoin('notes_tags', 'notes.id', 'notes_tags.note_id')
      .leftJoin('tags', 'tags.id', 'notes_tags.tag_id')
      .where('notes.id', noteId);
  })
  .then(result => {
    if (result) {
      // Hydrate the results
      const hydrated = hydrateNotes(result)[0];
      // Respond with a location header, a 201 status and a note object
      res.location(`${req.originalUrl}/${hydrated.id}`).status(201).json(hydrated);
    } else {
      next();
    }
  })
  .catch(err => next(err));
});


// Delete an item
router.delete('/:id', (req, res, next) => {
  const reqid = req.params.id;
  knex('notes')
  .where({id: reqid})
  .del()
  .then( ()=> res.sendStatus(204))
  .catch(err => {
    next(err);
  });
});

module.exports = router;
