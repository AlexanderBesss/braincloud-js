
function BCVirtualCurrency() {
    var bc = this;

    bc.virtualCurrency = {};

    bc.SERVICE_VIRTUAL_CURRENCY = "virtualCurrency";

    bc.virtualCurrency.OPERATION_GET_CURRENCY = "GET_PLAYER_VC";
    bc.virtualCurrency.OPERATION_GET_PARENT_CURRENCY = "GET_PARENT_VC";
    bc.virtualCurrency.OPERATION_GET_PEER_CURRENCY = "GET_PEER_VC";

    /**
     * Retrieve the user's currency account. Optional parameters: currencyType (if retrieving all currencies).
     *
     * Service Name - VirtualCurrency
     * Service Operation - GetCurrency
     *
     * @param currencyType
     * @param callback The method to be invoked when the server response is received
     */
    bc.virtualCurrency.getCurrency = function(currencyType, callback) {
        var message = {
            vcId: currencyType
        };
        
        bc.brainCloudManager.sendRequest({
            service: bc.SERVICE_VIRTUAL_CURRENCY,
            operation: bc.virtualCurrency.OPERATION_GET_CURRENCY,
            data: message,
            callback: callback
        });
    };

    /**
     * Retrieve the parent user's currency account. Optional parameters: currencyType (if retrieving all currencies).
     *
     * Service Name - VirtualCurrency
     * Service Operation - GetParentCurrency
     *
     * @param currencyType
     * @param levelName
     * @param callback The method to be invoked when the server response is received
    */
    bc.virtualCurrency.getParentCurrency = function(currencyType, levelName, callback) {
        var message = {
            vcId: currencyType,
            levelName: levelName
        };
        
        bc.brainCloudManager.sendRequest({
            service: bc.SERVICE_VIRTUAL_CURRENCY,
            operation: bc.virtualCurrency.OPERATION_GET_PARENT_CURRENCY,
            data: message,
            callback: callback
        });
    };

    /**
     * Retrieve the peer user's currency account. Optional parameters: vcId (if retrieving all currencies).
     *
     * Service Name - VirtualCurrency
     * Service Operation - GetPeerCurrency
     *
     * @param vcId
     * @param peerCode
     * @param callback The method to be invoked when the server response is received
    */
    bc.virtualCurrency.getPeerCurrency = function(currencyType, peerCode, callback) {
        var message = {
            vcId: currencyType,
            peerCode: peerCode
        };
        
        bc.brainCloudManager.sendRequest({
            service: bc.SERVICE_VIRTUAL_CURRENCY,
            operation: bc.virtualCurrency.OPERATION_GET_PEER_CURRENCY,
            data: message,
            callback: callback
        });
    };

    /**
     * Award player the passed-in amount of currency. Returns an object representing the new currency values.
     *
     * Note: Awarding 0 or negative currency will return an error. Use ConsumeCurrency to remove currency values.
     *
     * Service Name - VirtualCurrency
     * Service Operation - AwardCurrency
     *
     *  @deprecated For security reasons calling this API from the client is not recommended, and is rejected at the server by default. To over-ride, enable the 'Allow Currency Calls from Client' compatibility setting in the Design Portal.
     *
     * @param currencyType
     * @param amount
     * @param callback The method to be invoked when the server response is received
     */
    bc.virtualCurrency.awardCurrency = function(currencyType, amount, callback) {
        var message = {
            vcId: currencyType,
            vcAmount: amount
        };
        bc.brainCloudManager.sendRequest({
            service: bc.SERVICE_VIRTUAL_CURRENCY,
            operation: bc.product.OPERATION_AWARD_VC,
            data: message,
            callback: callback
        });
    };

    /**
     * Consume the passed-in amount of currency from the player.
     *
     * Note: Consuming 0 or negative currency will return an error. Use AwardCurrency to add currency values.
     *
     * Service Name - VirtualCurrency
     * Service Operation - ConsumeCurrency
     *
     * @deprecated For security reasons calling this API from the client is not recommended, and is rejected at the server by default. To over-ride, enable the 'Allow Currency Calls from Client' compatibility setting in the Design Portal.
     *
     * @param vcId
     * @param peerCode
     * @param callback The method to be invoked when the server response is received
     */
    bc.virtualCurrency.consumeCurrency = function(currencyType, amount, callback) {
        bc.brainCloudManager.sendRequest({
            service: bc.SERVICE_VIRTUAL_CURRENCY,
            operation: bc.product.OPERATION_CONSUME_PLAYER_VC,
            data: {
                vcId: currencyType,
                vcAmount: amount
            },
            callback: callback
        });
    };

}

BCVirtualCurrency.apply(window.brainCloudClient = window.brainCloudClient || {});
