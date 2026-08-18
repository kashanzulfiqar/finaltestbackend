let Leads = require("../models/leads.model");
let Source = require("../models/sourceOptions.model");
let Medium = require("../models/comMedium.model");
let Permission = require("../models/permissions.model");
let User = require("../models/user.model");
let services = require("../utils/services");

let methods = {
  addLead: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "inputs are required to add lead!",
          success: false,
        });
      }

      data.companyId = companyId;
      data.lastReachOut = data.reachOut;
      const reachOutEntry = {
        date: data.reachOut || null,
        communicationMedium: data.communicationMedium,
        communicatedBy: data.communicatedBy,
        comments: data.comments || null,
      };

      data.reachOuts = [reachOutEntry];
      data.modifiedBy = _id;

      let lead = new Leads(data);
      let addLead = await lead.save();
      if (!addLead) {
        return res.status(404).json({
          msg: "Lead not added",
          success: false,
        });
      }
      return res.status(200).json({
        Lead: addLead,
        msg: "Lead added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add lead",
        error: error,
        success: false,
      });
    }
  },

  viewLead: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }

      const paginateOptions =
        req.query.page && req.query.limit
          ? { page: req.query.page, limit: req.query.limit }
          : {
              page: 1,
              limit: 10,
            };

      const populateOptions = [
        {
          path: "accountManager",
          select: "fullName imageUrl",
        },
        {
          path: "source",
          select: "title",
        },
        {
          path: "companyId",
          select: "companyName",
        },
        {
          path: "modifiedBy",
          select: "fullName imageUrl",
        },
        {
          path: "reachOuts.communicationMedium", 
          select: "title", 
        },
        {
          path: "reachOuts.communicatedBy", 
          select: "fullName imageUrl", 
        },
        {
          path: "notes.addedBy", 
          select: "fullName imageUrl", 
        },
      ];

      var options = {
        ...paginateOptions,
        sort: { createdAt: -1 },
        populate: populateOptions,
      };
      let companyId = req.token.companyId;

      let filter = {deleted: false };

      filter.companyId = companyId;

      if (req.query.leadId) {
        filter._id = req.query.leadId;
      }
      if (req.query.status) {
        filter.status = req.query.status;
      }
      if (req.query.projectType) {
          filter.projectType = req.query.projectType;
      }
      if (req.query.accountManager) {
          filter.accountManager = req.query.accountManager;
      }
      if (req.query.firstReachOut) {
          filter.reachOut = { $gte: req.query.firstReachOut };
      }
      if (req.query.lastReachOut) {
          filter.lastReachOut = { $lte: req.query.lastReachOut };
      }
      
      let findLeads = await Leads.paginate(filter, { ...options });

      findLeads.docs = findLeads?.docs?.map((lead) => {
        lead.reachOuts = lead?.reachOuts?.sort((a, b) => new Date(a.date) - new Date(b.date));
        return lead;
      });

      let findManagerLeads = await Leads.find({deleted: false, companyId: companyId});

      let accountManagerIds = [...new Set(findManagerLeads?.map(lead => lead.accountManager._id))];

      // Fetch accountManager details
      let accountManagers = await User.find({
        _id: { $in: accountManagerIds },
      }).select("fullName imageUrl");

      let totalLeads, pendingLeads, onHoldLeads, convertedLeads, notConvertedLeads, activeLeads;

      totalLeads = await Leads.countDocuments(filter);

      if (req.query.status) {
        pendingLeads = req.query.status === "pending" ? totalLeads : 0;
        onHoldLeads = req.query.status === "onHold" ? totalLeads : 0;
        convertedLeads = req.query.status === "converted" ? totalLeads : 0;
        notConvertedLeads = req.query.status === "notConverted" ? totalLeads : 0;
      } else {
        pendingLeads = await Leads.countDocuments({ ...filter, status: "pending" });
        onHoldLeads = await Leads.countDocuments({ ...filter, status: "onHold" });
        convertedLeads = await Leads.countDocuments({ ...filter, status: "converted" });
        notConvertedLeads = await Leads.countDocuments({ ...filter, status: "notConverted" });
      }

      activeLeads = pendingLeads + onHoldLeads;

      console.log("totalLeads", totalLeads)
      console.log("convertedLeads", convertedLeads)
      console.log("notConvertedLeads", notConvertedLeads)
      let stats = {
        totalLeads,
        pendingLeads,
        onHoldLeads,
        convertedLeads,
        notConvertedLeads,
        pendingPercentage: totalLeads ? ((pendingLeads / totalLeads) * 100).toFixed(1) : 0,
        onHoldPercentage: totalLeads ? ((onHoldLeads / totalLeads) * 100).toFixed(1) : 0,
        convertedPercentage: totalLeads ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0,
        notConvertedPercentage: totalLeads ? ((notConvertedLeads / totalLeads) * 100).toFixed(1) : 0,
        activeLeads
      };

      if (!findLeads) {
        findLeads = "";
      }
      return res.status(200).json({
        Lead: findLeads,
        success: true,
        stats,
        accountManagers
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        msg: "Failed to view leads",
        error: error,
        success: false,
      });
    }
  },

  addFiles: async (req, res) => {
    try {
      const { _id } = req.token; // Current user ID from token
      const findUser = await User.findOne({ _id });
      const roleId = findUser.roleId;
      let isAllowed;
  
      // Check user permissions
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
  
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
  
      const leadId = req.body.leadId;
      const newFiles = req.body.files; // New files from request body
  
      if (!leadId || !Array.isArray(newFiles) || newFiles.length === 0) {
        return res.status(400).json({
          msg: "Lead ID and files are required",
          success: false,
        });
      }
  
      // Find the lead document
      const lead = await Leads.findById(leadId);
      if (!lead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }
  
      // Add new files at the top of the existing files array
      lead.files = [...newFiles, ...lead.files];
      lead.modifiedBy = _id; // Update modifiedBy field
  
      // Save the updated lead document
      await lead.save();
  
      return res.status(200).json({
        msg: "Files added successfully",
        success: true,
        updatedLead: lead,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Failed to add files",
        error: error.message,
        success: false,
      });
    }
  },
  
  viewFiles: async (req, res) => {
    try {
      const { _id } = req.token;
      const findUser = await User.findOne({ _id });
      const roleId = findUser.roleId;
      let isAllowed;
  
      // Check user permissions
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
  
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
  
      const leadId = req.query.leadId;
      if (!leadId) {
        return res.status(400).json({
          msg: "Lead ID is required",
          success: false,
        });
      }
  
      // Fetch the lead document with populated notes
      const lead = await Leads.findOne({ _id: leadId, deleted: false })
        .populate('notes.addedBy', 'fullName imageUrl _id')
        .populate('files.ownerId', 'fullName imageUrl _id');
  
      if (!lead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }
  
      // Extract files from the lead's main 'files' array
      const leadFiles = lead?.files?.map(file => ({
        _id: file?.asset_id,
        asset_id: file?.asset_id,
        public_id: file?.public_id,
        fileName: file?.fileName,
        imageUrl: file?.imageUrl,
        resource_type: file?.resource_type,
        fileSize: file?.bytes,
        createdAt: file?.createdAt,
        addedBy: file?.ownerId ? {
          _id: file?.ownerId?._id,
          fullName: file?.ownerId?.fullName,
          imageUrl: file?.ownerId?.imageUrl,
        } : null,
        noteId: null,
      }));
  
      // Extract files from the notes' 'files' arrays
      const noteFiles = lead?.notes?.flatMap(note => 
        note.files.map(file => ({
          _id: file?.asset_id,
          asset_id: file?.asset_id,
          public_id: file?.public_id,
          fileName: file?.fileName,
          imageUrl: file?.imageUrl,
          resource_type: file?.resource_type,
          fileSize: file?.bytes,
          createdAt: file?.createdAt,
          addedBy: note?.addedBy ? {
            _id: note?.addedBy?._id,
            fullName: note?.addedBy?.fullName,
            imageUrl: note?.addedBy?.imageUrl,
          } : null,
          noteId: note._id,
        }))
      );
  
      // Combine all files into a single array
      const allFiles = [...leadFiles, ...noteFiles];

      const sortedFiles = allFiles.sort((a, b) => new Date(b?.createdAt) - new Date(a?.createdAt));
  
      return res.status(200).json({
        files: sortedFiles,
        success: true,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Failed to view files",
        error: error.message,
        success: false,
      });
    }
  },
  
  deleteFile: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
  
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
  
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
  
      const { noteId, leadId, fileId } = req.body._id || {};
  
      if (!fileId || !leadId) {
        return res.status(400).json({
          msg: "Both file ID and lead ID are required",
          success: false,
        });
      }
  
      let updatedLead;
  
      if (!noteId) {
        // Case 1: File is directly part of the lead document's "files" array
        updatedLead = await Leads.findOneAndUpdate(
          { _id: leadId },
          {
            $pull: { files: { asset_id: fileId } }, // Remove file from "files" array
            $set: { modifiedBy: userId }, // Update modifiedBy field
          },
          { new: true }
        );
      } else {
        // Case 2: File is part of a note
        updatedLead = await Leads.findOneAndUpdate(
          { _id: leadId, "notes._id": noteId },
          {
            $pull: { "notes.$.files": { asset_id: fileId } }, // Remove file from the note's "files" array
            $set: { modifiedBy: userId }, // Update modifiedBy field
          },
          { new: true }
        );
      }
  
      if (!updatedLead) {
        return res.status(404).json({
          msg: "No file with this ID found",
          success: false,
        });
      }
  
      return res.status(200).json({
        msg: "File deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete file",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
  
  updateLead: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let data = req.body;
      // console.log("comment",data.comments)
      // console.log("communicated by",data.communicatedBy)
      let id = data._id;
      if (!id) {
        return res.status(400).json({
          msg: "Lead id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingLead = await Leads.findOne({ _id: id });
      if (!existingLead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }

      if (data?.reachOuts && data?.reachOuts?.length > 0) {
        data.reachOuts.sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastReachOutObj = data.reachOuts[data.reachOuts.length - 1];
        const firsReachOutObj = data.reachOuts[0];

        data.lastReachOut = lastReachOutObj.date;
        data.communicatedBy = lastReachOutObj.communicatedBy;
        data.comments = lastReachOutObj.comments;
        data.reachOut = firsReachOutObj?.date;
      }

      data.modifiedBy = _id;

      let updateLead = await Leads.updateOne({ _id: id }, { ...data });
      res.status(200).json({
        data: updateLead,
        msg: "Lead updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update lead's record",
        error: error,
        success: false,
      });
    }
  },

  deleteLead: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Lead id is required",
          success: false,
        });
      }
      let deleteLead = await Leads.findOneAndUpdate({ _id }, { deleted: true });
      if (!deleteLead) {
        return res.status(404).json({
          msg: "No lead with this id found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "Lead deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete lead",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },

  addReachOut: async (req, res) => {
    try {
      const { _id } = req.token; // User ID from the token
      const findUser = await User.findOne({ _id });
      const roleId = findUser.roleId;
      let isAllowed;
  
      // Check if user has permissions
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
  
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
  
      const { reachOut } = req.body; // New reach-out data
      const leadId = req.body?.leadId; // Lead ID
  
      if (!leadId) {
        return res.status(400).json({
          msg: "Lead ID is required",
          success: false,
        });
      }
  
      if (!reachOut) {
        return res.status(400).json({
          msg: "Reach-out data is required",
          success: false,
        });
      }
  
      // Find the lead
      const existingLead = await Leads.findOne({ _id: leadId });
      if (!existingLead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }

      const currentReachOuts = existingLead?.reachOuts || [];
      const updatedReachOuts = [
        { ...reachOut }, // Add new reach-out at the beginning
        ...currentReachOuts,
      ];

      updatedReachOuts.sort((a, b) => new Date(a.date) - new Date(b.date));

      const oldestReachOut = updatedReachOuts[0];
      const latestReachOut = updatedReachOuts[updatedReachOuts.length - 1];
  
      // Add the new reach-out to the top of the array
      const updatedLead = await Leads.findOneAndUpdate(
        { _id: leadId },
        {
          $push: {
            reachOuts: {
              $each: [reachOut], // Add the new reach-out
              $position: 0, // Add it to the top of the array
            },
          },
          $set: {
            modifiedBy: _id, // Update modifiedBy
            comments: latestReachOut?.comments, // Latest comments
            lastReachOut: latestReachOut?.date, // Latest reach-out date
            communicatedBy: latestReachOut?.communicatedBy, // Latest communicator
            reachOut: oldestReachOut?.date,
          },
        },
        { new: true } // Return the updated document
      );
  
      if (!updatedLead) {
        return res.status(404).json({
          msg: "Failed to add reach-out to the lead",
          success: false,
        });
      }
  
      return res.status(200).json({
        data: updatedLead,
        msg: "Reach-out added successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error adding reach-out:", error);
      res.status(500).json({
        msg: "Failed to add reach-out",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
  
  updateReachOut: async (req, res) => {
    try {
      const { _id } = req.token; // User ID from the token
      const findUser = await User.findOne({ _id });
      const roleId = findUser.roleId;
      let isAllowed;
  
      // Check if user has permissions
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        const checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
  
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: false,
        });
      }
  
      const { reachOut } = req.body; // Reach-out data to update
      const reachOutId = reachOut?._id; // Reach-out ID
      const leadId = req.body?.leadId; // Lead ID
  
      if (!leadId) {
        return res.status(400).json({
          msg: "Lead ID is required",
          success: false,
        });
      }
  
      if (!reachOutId) {
        return res.status(400).json({
          msg: "Reach-out ID is required",
          success: false,
        });
      }
  
      // Find the lead
      const existingLead = await Leads.findOne({ _id: leadId });
      if (!existingLead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }

      const currentReachOuts = existingLead?.reachOuts || [];
      const updatedReachOuts = [
        { ...reachOut }, // Add new reach-out at the beginning
        ...currentReachOuts,
      ];

      updatedReachOuts.sort((a, b) => new Date(a.date) - new Date(b.date));

      const oldestReachOut = updatedReachOuts[0];
      const latestReachOut = updatedReachOuts[updatedReachOuts.length - 1];
  
      const updatedLead = await Leads.findOneAndUpdate(
        { _id: leadId, "reachOuts._id": reachOutId },
        {
          $set: {
            "reachOuts.$": reachOut, 
            modifiedBy: _id,  
            comments: latestReachOut?.comments, // Latest comments
            lastReachOut: latestReachOut?.date, // Latest reach-out date
            communicatedBy: latestReachOut?.communicatedBy, // Latest communicator
            reachOut: oldestReachOut?.date,
          },
        },
        { new: true }
      );
  
      if (!updatedLead) {
        return res.status(404).json({
          msg: "Reach-out record not found in the lead",
          success: false,
        });
      }
  
      return res.status(200).json({
        data: updatedLead,
        msg: "Reach-out updated successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error updating reach-out:", error);
      res.status(500).json({
        msg: "Failed to update reach-out",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },

  deleteReachOut: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let reachOutId = req.body._id._id;
      let leadId = req.body._id.leadId;

      if (!reachOutId || !leadId) {
        return res.status(400).json({
          msg: "Both leadId and reachOut id are required",
          success: false,
        });
      }
  
      // Find and update the lead document to remove the reacOut
      let deleteReachOut = await Leads.findOneAndUpdate(
        { _id: leadId },
        { 
          $pull: { reachOuts: { _id: reachOutId } },
          $set: { modifiedBy: userId }  
        },
        { new: true }
      );

      if (!deleteReachOut) {
        return res.status(404).json({
          msg: "No reachOut with this id found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "reachOut deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete lead",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },

  addNote: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let noteData = req.body;
      noteData.addedBy = _id;
      // console.log("comment",data.comments)
      // console.log("communicated by",data.communicatedBy)
      let leadId = noteData?.leadId;
      if (!leadId) {
        return res.status(400).json({
          msg: "Lead id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingLead = await Leads.findOne({ _id: leadId });
      if (!existingLead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }

      //let updateLead = await Leads.updateOne({ _id: id }, { ...data });
      let updateLead = await Leads.findOneAndUpdate(
        { _id: leadId },
        {
          $push: {
            notes: {
              $each: [noteData],
              $position: 0 // Ensures the new note is added at the top
            }
          },
          modifiedBy: _id
        },
        { new: true }
      );
      res.status(200).json({
        data: updateLead,
        msg: "Note Added",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update lead's record",
        error: error,
        success: false,
      });
    }
  },

  updateNote: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let noteData = req.body.note;
      let noteId = noteData?._id
      let text = noteData?.text;
      let files = noteData?.files;
      noteData.addedBy = _id;
      // console.log("comment",data.comments)
      // console.log("communicated by",data.communicatedBy)
      let leadId = req.body?.leadId;
      if (!leadId) {
        return res.status(400).json({
          msg: "Lead id is required",
          success: false,
        });
      }

      // Retrieve the existing team
      let existingLead = await Leads.findOne({ _id: leadId });
      if (!existingLead) {
        return res.status(404).json({
          msg: "Lead not found",
          success: false,
        });
      }

      let updateLead = await Leads.updateOne(
        { _id: leadId },
        {
          $set: {
            "notes.$[note].text": text,
            "notes.$[note].files": files,
            modifiedBy: _id  // Ensure this variable holds the user ID to set
          }
        },
        {
          arrayFilters: [{ "note._id": noteId }]
        }
      );      
      
      res.status(200).json({
        data: updateLead,
        msg: "Note Updated",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to update lead's record",
        error: error,
        success: false,
      });
    }
  },

  deleteNote: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let noteId = req.body._id._id;
      let leadId = req.body._id.leadId;

      if (!noteId || !leadId) {
        return res.status(400).json({
          msg: "Both leadId and note id are required",
          success: false,
        });
      }
  
      // Find and update the lead document to remove the note
      let deleteNote = await Leads.findOneAndUpdate(
        { _id: leadId },
        { 
          $pull: { notes: { _id: noteId } },
          $set: { modifiedBy: userId }  
        },
        { new: true }
      );

      if (!deleteNote) {
        return res.status(404).json({
          msg: "No note with this id found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "note deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete lead",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },

  addSourceOption: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "source cannot be empty!",
          success: false,
        });
      }

      let existingSource = await Source.findOne({ title: data.title, companyId: companyId });
      if (existingSource) {
        return res.status(400).json({
          msg: "Title already exists!",
          success: false,
        });
      }

      data.companyId = companyId;
      let sourceOption = new Source(data);
      let addSource = await sourceOption.save();
      if (!addSource) {
        return res.status(404).json({
          msg: "Source option not added",
          success: false,
        });
      }
      return res.status(200).json({
        Source: addSource,
        msg: "Source option added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add source",
        error: error,
        success: false,
      });
    }
  },

  addCommunication: async (req, res) => {
    try {
      let { _id } = req.token;
      let findUser = await User.findOne({ _id });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let companyId = req.token.companyId;

      let data = req.body;
      if (!data) {
        return res.status(404).json({
          msg: "inputs are required to add medium!",
          success: false,
        });
      }

      let existingMedium = await Medium.findOne({ title: data.title, companyId: companyId });
      if (existingMedium) {
        return res.status(400).json({
          msg: "Title already exists!",
          success: false,
        });
      }

      data.companyId = companyId;
      let comMedium = new Medium(data);
      let addMedium = await comMedium.save();
      if (!addMedium) {
        return res.status(404).json({
          msg: "medium not added",
          success: false,
        });
      }
      return res.status(200).json({
        Medium: addMedium,
        msg: "medium added",
        success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to add medium",
        error: error,
        success: false,
      });
    }
  },

  viewSourceOption: async (req, res) => {
    try {
      let companyId = req.token.companyId;

      const sourceOptions = await Source.find({ 
        companyId: companyId, 
        deleted: false 
      });
      
      res.status(200).json({
          Sources: sourceOptions,
          msg: "Source options retrieved successfully",
          success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to get sources",
        error: error,
        success: false,
      });
    }
  },

  viewCommunication: async (req, res) => {
    try {
      let companyId = req.token.companyId;

      const mediumOptions = await Medium.find({ 
        companyId: companyId, 
        deleted: false 
      });

      res.status(200).json({
          Mediums: mediumOptions,
          msg: "Medium options retrieved successfully",
          success: true,
      });
    } catch (error) {
      return res.status(500).json({
        msg: "Failed to get mediums",
        error: error,
        success: false,
      });
    }
  },

  deleteSource: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "source id is required",
          success: false,
        });
      }
      let deleteSource = await Source.findOneAndUpdate({ _id }, { deleted: true });
      if (!deleteSource) {
        return res.status(404).json({
          msg: "No source with this id found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "source deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete lead",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },

  deleteMedium: async (req, res) => {
    try {
      let userId = req.token._id;
      let findUser = await User.findOne({ _id: userId });
      let roleId = findUser.roleId;
      let isAllowed;
      if (findUser.role === "admin") {
        isAllowed = true;
      } else {
        // Perform the permission check for non-admin users
        let checkPermission = await Permission.findOne({ roleId });
        isAllowed = services.checkPermissions(checkPermission, "leadsManagement", "leadsManagement");
      }
      if (!isAllowed) {
        return res.status(401).json({
          msg: "Unauthorized User",
          success: true,
        });
      }
      let _id = req.body._id;
      if (!_id) {
        return res.status(400).json({
          msg: "Medium id is required",
          success: false,
        });
      }
      let deleteMedium = await Medium.findOneAndUpdate({ _id }, { deleted: true });
      if (!deleteMedium) {
        return res.status(404).json({
          msg: "No medium with this id found",
          success: false,
        });
      }

      return res.status(200).json({
        msg: "Medium deleted successfully",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        msg: "Failed to delete medium",
        error: error.message || "Something went wrong.",
        success: false,
      });
    }
  },
};

module.exports = methods;
