const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');/* to connect server to the database */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();

// middleware 
app.use(cors());
app.use(express.json());

// verify jwt 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

// connect server to the database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0ixir.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// to work with database 
async function run() {
    try {
        await client.connect();
        const trimsCollection = client.db('accessories').collection('trims');
        const reviewsCollection = client.db('accessories').collection('reviews');
        const orderCollection = client.db('accessories').collection('orders');
        const profileCollection = client.db('accessories').collection('profile');
        console.log('db connected');

        // login authorization (JWT)
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        });

        // get all trims data from database and send to client side
        app.get('/trims', async (req, res) => {
            const query = {};
            const cursor = trimsCollection.find(query);
            const trims = await cursor.toArray();
            res.send(trims);
        });
        //get id-wise item  from database and send to client side for purchase page
        app.get('/trims/:id', async (req, res) => {
            const idParams = req.params.id;
            const query = { _id: ObjectId(idParams) };
            const item = await trimsCollection.findOne(query);
            res.send(item);

        });
        // get all reviews data from database and send to client side
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews.reverse());
        });
        // receive order request from client side in the purchase page , save into DB and then send response
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
        //  verify JWT and email-wise order find and send to client
        app.get('/orders', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(403).send({ message: 'Forbidden access' })
            }
        });
        // get order id-wise and delete on cancel button clicked from my order page in dashboard
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });
        // receive review request from client side in the add a review page , save into DB and then send response
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });
        // receive profile creation or update request from client side in the my profile page , save into DB and then send response
        app.put('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const profile = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: profile,
            };
            const newProfile = await profileCollection.updateOne(filter, updateDoc, option)
            res.send(newProfile);
        });
        // get all profiles from DB and send to client side make admin dashboard page
        app.get('/profiles', verifyJWT, async (req, res) => {
            const allProfiles = await profileCollection.find().toArray();
            res.send(allProfiles);
        });
        // add admin API
        app.put('/profiles/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await profileCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await profileCollection.updateOne(filter, updateDoc)
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden !!!' })
            }
        });

        // check whether the user is admin or not 
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await profileCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ admin: isAdmin });
        });
        // get profiles id-wise and delete on remove button clicked from make an admin page in dashboard
        app.delete('/profiles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await profileCollection.deleteOne(query);
            res.send(result);
        });












    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Z&Z Server is running')
});


app.listen(port, () => {
    console.log(`Z&Z Server is running at port : ${port}`);
});