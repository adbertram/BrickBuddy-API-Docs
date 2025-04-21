const express = require('express');
const router = express.Router();

// Route for getting piece destinations (Simplified for Demo)
router.get('/', async (req, res, next) => {
    console.log('GET /api/piece-destinations - Request received');

    try {
        // Mock user directly in the route instead of using middleware
        const userId = 123; // Mock user ID
        const { lot_id } = req.query;

        console.log('Request parameters:', { userId, lot_id });

        // Basic validation
        if (!lot_id) {
            const error = new Error('Missing required parameter: lot_id');
            error.statusCode = 400;
            throw error;
        }

        // Simplified mock data response
        const mockDestinations = {
            set_destinations: [
                {
                    name: "Demo Set 1",
                    number: "75300-1",
                    user_set_item_id: 101,
                    qty_have: 5,
                    user_inventory_item_location_name: "Set Bin A",
                    qty_to_allocate: 2
                },
                {
                    name: "Demo Set 2",
                    number: "10281-1",
                    user_set_item_id: 105,
                    qty_have: 1,
                    user_inventory_item_location_name: "Set Bin B",
                    qty_to_allocate: 1
                }
            ],
            part_destinations: [
                {
                    recommended: true,
                    qty_on_hand: 0,
                    user_inventory_item_location_id: 201,
                    user_inventory_item_location_name: "Parts Drawer 5",
                    container_available_weight: 50.5
                },
                {
                    recommended: false,
                    qty_on_hand: 10,
                    user_inventory_item_location_id: 210,
                    user_inventory_item_location_name: "Bulk Parts Tub",
                    container_available_weight: 1000.0
                }
            ]
        };

        console.log('Mock piece destinations generated successfully');
        return res.success(
            mockDestinations,
            'RETRIEVED',
            'Piece destinations retrieved successfully (Demo)'
        );
    } catch (error) {
        console.error('Error in getPieceDestinations route handler:', error);
        next(error);
    }
});

module.exports = router;