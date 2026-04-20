/**
 * Remap Category.image_url and Product.image_url to images that actually exist
 * on disk, cycling through the available files in public/images/categories/.
 * Products inherit their category's image.
 */
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL;
    await mongoose.connect(uri);
    const Category = require("../src/models/Category");
    const Product = require("../src/models/Product");

    const dir = path.join(__dirname, "..", "public", "images", "categories");
    const files = fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (files.length === 0) throw new Error("No category images on disk");
    console.log(`Found ${files.length} image files on disk`);

    const categories = await Category.find({}).select("_id name image_url").lean();
    console.log(`Updating ${categories.length} categories`);

    // Map each category → a file (round-robin, stable by sorted _id)
    categories.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
    const catImg = new Map();
    categories.forEach((cat, idx) => {
        const url = `/images/categories/${files[idx % files.length]}`;
        catImg.set(cat._id.toString(), url);
    });

    const catOps = [...catImg.entries()].map(([id, url]) => ({
        updateOne: { filter: { _id: new mongoose.Types.ObjectId(id) }, update: { $set: { image_url: url } } },
    }));
    const catRes = await Category.bulkWrite(catOps);
    console.log(`Categories modified: ${catRes.modifiedCount}`);

    // Products inherit from category
    const products = await Product.find({}).select("_id category_id").lean();
    const prodOps = products
        .map((p) => {
            const url = catImg.get(p.category_id?.toString());
            if (!url) return null;
            return {
                updateOne: { filter: { _id: p._id }, update: { $set: { image_url: url } } },
            };
        })
        .filter(Boolean);
    if (prodOps.length) {
        const prodRes = await Product.bulkWrite(prodOps);
        console.log(`Products modified: ${prodRes.modifiedCount}`);
    }

    await mongoose.connection.close();
    console.log("✅ Done");
}

main().catch(async (e) => {
    console.error(e);
    try { await mongoose.connection.close(); } catch (_) { }
    process.exit(1);
});
