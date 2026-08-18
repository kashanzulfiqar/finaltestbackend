const mongoose = require('mongoose');
const companyModel = require('../models/company.model');
const { ObjectId } = require('mongodb');

(async function databaseMigrations() {
    let session;

    try {
        console.log(`--------Script started-------`);

        // Replace 'db_url' with your MongoDB connection string
        await mongoose.connect(`db_url`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            writeConcern: { w: 'majority', j: true, wtimeout: 1000 },
            dbName: "db_name" // Replace 'db_name' with your actual database name
        });

        session = await mongoose.startSession(); 
        session.startTransaction(); 

        const arrayIds = [
            '66b9d50fa890e593115b3ca9',
            '66ac9480fa13d37a48673700',
            '66ac93eac2d7935e8561ad0f',
            '66ac8fae43bfda1d6983ada0',
            '65812acf529fa32d978bb491'
        ]; //these are the ids i used from the staging database for testing, replace them with those from the real database

        const objectIdsArray = arrayIds.map(id => new ObjectId(id));

        await companyModel.deleteMany({ _id: { $in: arrayIds } }, { session });

        const db = mongoose.connection.db;

        const collections = await db.listCollections().toArray();

        for (let collectionInfo of collections) {
            //console.log("collectionInfo",collectionInfo)
            const collectionName = collectionInfo.name;
            
            // Skip system collections (like system.indexes)
            if (collectionName.startsWith('system.')) continue;

            const collection = db.collection(collectionName);
            
            //console.log("collection",collection)

            const hasCompanyId = await collection.findOne({ companyId: { $in: objectIdsArray } });
            
            if (hasCompanyId) {
                console.log(`Deleting documents from collection ${collectionName} where companyId is referenced.`);

                await collection.deleteMany({ companyId: { $in: objectIdsArray } }, { session });
            }
            else {
                console.log(`No companyId references found in collection ${collectionName}`);
            }
        }

        // Commit the transaction if everything goes well
        await session.commitTransaction();
        console.log("The given companies and all associated tables were deleted successfully.");

        session.endSession();  // End the session

        mongoose.connection.close((err) => {
            if (err) {
                console.error('Error closing mongoose connection', err);
            } else {
                console.log('Mongoose connection closed successfully.');
            }
        });

        console.log('Migration completed successfully.');
        process.exit(0); 
    } catch (err) {
        // If any error occurs, abort (rollback) the transaction
        if (session) {
            await session.abortTransaction();
            session.endSession();  // End the session even if there was an error
        }

        console.error('Error during migration:', err);

        mongoose.connection.close((err) => {
            if (err) {
                console.error('Error closing mongoose connection', err);
            }
        });

        process.exit(1); // Exit with error
    }
})();
