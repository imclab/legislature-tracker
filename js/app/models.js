/**
 * Models for the Legislature Tracker app.
 */
 
(function($, w, undefined) {
  
  /**
   * Base Model for Open States items
   */
  LT.OSModel = Backbone.Model.extend({
    urlBase: function() {
      return 'http://openstates.org/api/v1/';
    },
    
    urlEnd: function() {
      return '/?apikey=' + encodeURI(this.options.apiKey) + '&callback=?';
    },
    
    url: function() {
      return this.urlBase() + encodeURI(this.osType) + '/' + 
        encodeURI(this.id) + this.urlEnd();
    },
    
    initialize: function(attr, options) {
      this.options = options;
      
      this.on('sync', function(model, resp, options) {
        // Mark as fetched so we can use some caching
        model.set('fetched', true);
      });
    },
    
    parseOSData: function() {
      // Get some aggregate data from the Open State data
      
      // Parse some dates
      this.set('created_at', moment(this.get('created_at')));
      this.set('updated_at', moment(this.get('updated_at')));
      
      // Figure out newest
      this.set('newest_action', this.get('actions')[0]);
    }
  });
  
  /**
   * Model for Open States Bill
   */
  LT.OSStateModel = LT.OSModel.extend({
    url: function() {
      return this.urlBase() + 'metadata/'  + encodeURI(this.options.state) + 
        this.urlEnd();
    }
  });
  
  /**
   * Model for Open States Bill
   */
  LT.OSBillModel = LT.OSModel.extend({
    url: function() {
      if (!_.isUndefined(this.id)) {
        return this.urlBase() + 'bills/'  + this.id + this.urlEnd();
      }
      else {
        return this.urlBase() + 'bills/'  + encodeURI(this.options.state) + '/' +
          encodeURI(this.options.session) + '/' +
          encodeURI(this.get('bill_id')) + this.urlEnd();
      }
    },
    
    initialize: function(attr, options) {
      LT.OSBillModel.__super__.initialize.apply(this, arguments);
      
      this.on('sync', function(model, resp, options) {
        this.parseOSData();
      });
    },
    
    parseOSData: function() {
      // Get some aggregate data from the Open State data
      var swapper;
      
      // Parse some dates
      this.set('created_at', moment(this.get('created_at')));
      this.set('updated_at', moment(this.get('updated_at')));
      
      // Action dates
      swapper = this.get('action_dates');
      _.each(swapper, function(a, i) {
        swapper[i] = (a) ? moment(a) : a;
      });
      this.set('action_dates', swapper);
      
      // Actions
      swapper = this.get('actions');
      _.each(swapper, function(a, i) {
        swapper[i].date = (a.date) ? moment(a.date) : a.date;
      });
      this.set('actions', swapper);
      
      // Figure out newest
      this.set('newest_action', this.get('actions')[0]);
      
      // Mark as introduced.  Not sure if this can be assumed
      // to be true
      swapper = this.get('action_dates');
      _.each(this.get('actions'), function(a) {
        if (a.type.indexOf('bill:introduced') !== -1) {
          swapper.introduced = a.date;
        }
      });
      this.set('action_dates', swapper);
      
      // Add custom events to actions
      swapper = this.get('custom_events');
      if (_.isArray(swapper) && swapper.length > 0) {
        this.set('actions', _.union(this.get('actions'), swapper));
      }
      
      // Sort action
      this.set('actions', _.sortBy(this.get('actions'), function(a) {
        return a.date.unix();
      }));
    }
  });
  
  /**
   * Model for Open States Legislator
   */
  LT.OSLegislatorModel = LT.OSModel.extend({
    osType: 'legislators'
  });
  
  /**
   * Model for Open States Committee
   */
  LT.OSCommitteeModel = LT.OSModel.extend({
    osType: 'committees'
  });
  
  /**
   * Model Legislature Tracker category
   */
  LT.CategoryModel = Backbone.Model.extend({
    initialize: function(attr, options) {
      this.options = options;
      this.set('bills', new LT.BillsCollection(null, this.options));
      this.getBills();
    },
    
    getBills: function() {
      // Gets reference to bills that are in the category
      var thisModel = this;
      var allBills = this.options.app.bills;
      var cat = this.get('id');

      allBills.each(function(b) {
        if (_.indexOf(b.get('ecategories'), cat) !== -1) {
          thisModel.get('bills').push(LT.utils.getModel('OSBillModel', 'bill_id', b.attributes, thisModel.options));
        }
      });
    }
  });

})(jQuery, window);