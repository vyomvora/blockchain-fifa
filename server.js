import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const app = express();
const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const ddbClient = new DynamoDBClient({ region: 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const LISTINGS_TABLE = 'marketplacelistings';
const COLLECTIONS_TABLE = 'usercollections';

app.post('/api/marketplace/list', async (req, res) => {
    const { cardId, seller, price, name } = req.body; 
    try {
        await ddbDocClient.send(new PutCommand({
            TableName: LISTINGS_TABLE,
            Item: { cardId, seller, price, name, active: true }
        }));
        res.json({ success: true });
    } catch (error) {
        console.error("Error listing card:", error);
        res.status(500).json({ error: 'Failed to list card' });
    }
});

app.get('/api/marketplace', async (req, res) => {
    try {
        const data = await ddbDocClient.send(new ScanCommand({
            TableName: LISTINGS_TABLE,
            FilterExpression: 'active = :active',
            ExpressionAttributeValues: { ':active': true }
        }));
        res.json({ listings: data.Items || [] });
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

app.post('/api/marketplace/buy', async (req, res) => {
    const { cardId, buyer } = req.body;
    try {
        const listing = (await ddbDocClient.send(new GetCommand({
            TableName: LISTINGS_TABLE,
            Key: { cardId }
        }))).Item;

        if (!listing || !listing.active) {
            return res.status(404).json({ error: 'Listing not found or inactive' });
        }

        await ddbDocClient.send(new UpdateCommand({
            TableName: LISTINGS_TABLE,
            Key: { cardId },
            UpdateExpression: 'SET active = :false',
            ExpressionAttributeValues: { ':false': false }
        }));

        await ddbDocClient.send(new UpdateCommand({
            TableName: COLLECTIONS_TABLE,
            Key: { wallet: buyer },
            UpdateExpression: 'SET cards = list_append(if_not_exists(cards, :empty), :new)',
            ExpressionAttributeValues: { ':empty': [], ':new': [{ cardId: listing.cardId, name: listing.name }] }
        }));

        res.json({ success: true });
    } catch (error) {
        console.error("Error processing buy:", error);
        res.status(500).json({ error: 'Failed to process buy' });
    }
});

app.post('/api/collection/add', async (req, res) => {
    const { wallet, cardId, name } = req.body;
    try {
        await ddbDocClient.send(new UpdateCommand({
            TableName: COLLECTIONS_TABLE,
            Key: { wallet },
            UpdateExpression: 'SET cards = list_append(if_not_exists(cards, :empty), :new)',
            ExpressionAttributeValues: { ':empty': [], ':new': [{ cardId, name }] }
        }));
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding to collection:", error);
        res.status(500).json({ error: 'Failed to add card' });
    }
});

app.get('/api/collection/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    try {
        const data = await ddbDocClient.send(new GetCommand({
            TableName: COLLECTIONS_TABLE,
            Key: { wallet }
        }));
        res.json({ collection: data.Item?.cards || [] });
    } catch (error) {
        console.error("Error fetching collection:", error);
        res.status(500).json({ error: 'Failed to fetch collection' });
    }
});

app.get('/api/player/:playerId', async (req, res) => {
    const playerId = req.params.playerId;
    try {
        const response = await axios.get(`https://v3.football.api-sports.io/players?id=${playerId}&season=2023`, {
            headers: {
                "x-rapidapi-host": "v3.football.api-sports.io",
                "x-rapidapi-key": "e1fb078fd03a78be2d096c462ce2daf0" 
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("API Football Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error fetching player details' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

