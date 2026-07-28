const mongoose = require('mongoose');
const uri = 'mongodb+srv://furqanSandsOrnaments:abcfrk123@cluster0.nywnexf.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  console.log('Connected to DB. Updating shop-men sections...');
  
  // Pick Your Glam Updates
  const glamMap = {
    'men-glam-party-spark': '/shop?source=men&category=party-spark',
    'men-glam-wedding-jewels': '/shop?source=men&category=wedding-jewels',
    'men-glam-ritual-range': '/shop?source=men&category=ritual-range',
    'men-glam-daily-wear': '/shop?source=men&category=daily-wear',
    'men-glam-office-wear': '/shop?source=men&category=office-wear'
  };

  const sectionGlam = await db.collection('pagesections').findOne({ pageKey: 'shop-men', sectionKey: 'pick-your-glam' });
  if (sectionGlam && sectionGlam.items) {
     sectionGlam.items = sectionGlam.items.map(item => {
        if (glamMap[item.id]) {
            item.path = glamMap[item.id];
            item.categoryId = null; // Clear old category id if any
        }
        return item;
     });
     await db.collection('pagesections').updateOne({ _id: sectionGlam._id }, { $set: { items: sectionGlam.items } });
     console.log('Updated pick-your-glam');
  }

  // Explore Collections Updates
  const exploreMap = {
    'men-explore-edge': '/shop?source=men&search=edge',
    'men-explore-the-classics': '/shop?source=men&search=classic',
    'men-explore-iykyk': '/shop?source=men&search=street'
  };

  const sectionExplore = await db.collection('pagesections').findOne({ pageKey: 'shop-men', sectionKey: 'explore-collections' });
  if (sectionExplore && sectionExplore.items) {
     sectionExplore.items = sectionExplore.items.map(item => {
        if (exploreMap[item.id]) {
            item.path = exploreMap[item.id];
            item.categoryId = null;
        }
        return item;
     });
     await db.collection('pagesections').updateOne({ _id: sectionExplore._id }, { $set: { items: sectionExplore.items } });
     console.log('Updated explore-collections');
  }

  console.log('Done.');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
