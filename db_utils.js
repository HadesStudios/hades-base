const mongodb = require('mongodb');

function exportDocument(document) {
	if (!document) return;
	if (document._id && typeof document._id !== 'string') {
		document._id = document._id.toString();
	}
	return document;
}

function exportDocuments(documents) {
	if (!Array.isArray(documents)) return;
	return documents.map((document) => exportDocument(document));
}

function safeObjectArgument(object) {
	if (object === null || object === undefined) return {};

	// If it's an array, return an empty object — arrays are not valid
	// for Mongo query/update/options shapes in this wrapper.
	if (Array.isArray(object)) {
		return {};
	}

	if (typeof object !== 'object') return {};

	if (object._id) {
		try {
			object._id = mongodb.ObjectID(object._id);
		} catch (e) {
			// leave as-is if conversion fails
		}
	}

	return object;
}

function safeCallback(cb, ...args) {
	if (typeof cb === 'function') return setImmediate(() => cb(...args));
	else return false;
}

module.exports = {
	exportDocument,
	exportDocuments,

	safeObjectArgument,
	safeCallback,
};
