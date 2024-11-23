const listing = require('../models/listing');
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');

// Load Mapbox Access Token
const mapToken = process.env.MAP_TOKEN;
console.log(mapToken);
if (!mapToken) {
    console.error("Error: Mapbox access token is not set. Please check your .env file.");
    process.exit(1); // Exit the process if token is missing
}
const geocodingClient = mbxGeoCoding({ accessToken: mapToken });

module.exports.RenderIndexPage = async (req, res) => {
    let { Search, category } = req.query;
    try {
        if ((!Search || Search === '') && (!category || category === '')) {
            let data = await listing.find();
            res.render('listings/index.ejs', { data });
        } else if (!category || category === '') {
            let Searchdata = await listing.find({
                $or: [
                    { location: { $regex: Search, $options: 'i' } },
                    { country: { $regex: Search, $options: 'i' } }
                ]
            });
            if (Searchdata.length == 0) {
                req.flash('error', 'Sorry, listing not available.');
                res.redirect('/listings');
            } else {
                res.render('listings/index.ejs', { data: Searchdata });
            }
        } else {
            let categoryData = await listing.find({ category: category });
            if (categoryData.length == 0) {
                req.flash('error', 'Sorry, listing not available.');
                res.redirect('/listings');
            } else {
                res.render('listings/index.ejs', { data: categoryData });
            }
        }
    } catch (error) {
        console.error('Error fetching listings:', error);
        req.flash('error', 'Unable to fetch listings. Please try again later.');
        res.redirect('/listings');
    }
};

module.exports.RenderNewPage = (req, res) => {
    res.render('listings/new.ejs');
};

module.exports.CreateNewList = async (req, res) => {
    try {
        const response = await geocodingClient
            .forwardGeocode({
                query: req.body.listing.location + ',' + req.body.listing.country,
                limit: 1
            })
            .send();

        let url = req.file.path;
        let filename = req.file.filename;
        let newList = req.body.listing;
        newList.owner = req.user._id;

        // Add image and geometry data
        newList.image = { filename, url };
        newList.geometry = response.body.features[0].geometry;

        let list = new listing(newList);
        await list.save();

        req.flash('success', 'New listing created successfully.');
        res.redirect('/listings');
    } catch (error) {
        console.error('Error creating listing:', error);
        req.flash('error', 'Failed to create listing. Please try again.');
        res.redirect('/listings/new');
    }
};

module.exports.RenderEditPage = async (req, res) => {
    let { id } = req.params;
    try {
        let list = await listing.findById(id);
        if (!list) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }
        let imgUrl = list.image.url;
        imgUrl = imgUrl.replace('/upload', '/upload/e_blur:300');
        res.render('listings/edit.ejs', { list, imgUrl });
    } catch (error) {
        console.error('Error fetching listing for edit:', error);
        req.flash('error', 'Unable to load edit page.');
        res.redirect('/listings');
    }
};

module.exports.EditPage = async (req, res) => {
    let { id } = req.params;
    try {
        const response = await geocodingClient
            .forwardGeocode({
                query: req.body.listing.location + ',' + req.body.listing.country,
                limit: 1
            })
            .send();

        let newListing = req.body;
        let data = newListing.listing;

        let Listing = await listing.findByIdAndUpdate(id, { ...data });
        if (!Listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }

        // Update image if a new file is uploaded
        if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            Listing.image = { filename, url };
            await Listing.save();
        }

        // Update coordinates
        Listing.geometry = response.body.features[0].geometry;
        await Listing.save();

        req.flash('success', 'Listing updated successfully.');
        res.redirect(`/listings/${id}`);
    } catch (error) {
        console.error('Error updating listing:', error);
        req.flash('error', 'Failed to update listing. Please try again.');
        res.redirect(`/listings/${id}`);
    }
};

module.exports.DeletePage = async (req, res) => {
    let { id } = req.params;
    try {
        await listing.findByIdAndDelete(id);
        req.flash('success', 'Listing deleted successfully.');
        res.redirect('/listings');
    } catch (error) {
        console.error('Error deleting listing:', error);
        req.flash('error', 'Failed to delete listing.');
        res.redirect('/listings');
    }
};

module.exports.RenderShowPage = async (req, res) => {
    let { id } = req.params;
    try {
        const list = await listing.findById(id)
            .populate({ path: 'reviews', populate: { path: 'owner' } })
            .populate('owner');

        if (!list) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }

        res.render('listings/show.ejs', { list ,curruser: req.user,
            mapToken: process.env.MAP_TOKEN});
    } catch (error) {
        console.error('Error fetching listing:', error);
        req.flash('error', 'Unable to fetch listing details.');
        res.redirect('/listings');
    }
};
