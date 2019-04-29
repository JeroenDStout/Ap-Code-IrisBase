/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"
#include "BlackRoot/Pubc/Exception.h"
#include "BlackRoot/Pubc/Sys Path.h"
#include "BlackRoot/Pubc/Sys Sound.h"
#include "BlackRoot/Pubc/Sys Alert.h"

#include "Conduits/Pubc/Base Conduit.h"
#include "Conduits/Pubc/Disposable Message.h"

#include "ToolboxBase/Pubc/Interface Environment.h"

#include "IrisBase/Pubc/Base Layouts.h"
#include "IrisBase/Pubc/Layouts Protocol.h"

using namespace IrisBack::Base;
namespace fs = std::experimental::filesystem;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(Layouts);
CON_RMR_REGISTER_FUNC(Layouts, ping);
CON_RMR_REGISTER_FUNC(Layouts, conduit_connect_layouts);
CON_RMR_REGISTER_FUNC(Layouts, get_uuid_for_name);
CON_RMR_REGISTER_FUNC(Layouts, get_state_for_uuids);
CON_RMR_REGISTER_FUNC(Layouts, update_state_for_uuid);

    //  Setup
    // --------------------

void Layouts::initialise(const JSON param)
{
    this->Message_Nexus->set_ad_hoc_message_handling([=](Conduits::Raw::ConduitRef, Conduits::Raw::IRelayMessage * msg){
        this->rmr_handle_message_immediate_and_release(msg);
    });

    this->Objectman.initialise();
}

void Layouts::deinitialise(const JSON param)
{
    this->Objectman.deinitialise();
}

void Layouts::commence()
{
    this->internal_ensure_objectman_elements();

    this->Conduit_Handler = std::thread([=] {
        this->internal_conduit_handler();
    });
}

void Layouts::end_and_wait()
{
    DbAssertFatal(0);
}

    //  Objectman
    // --------------------
    
void Layouts::internal_ensure_objectman_elements()
{    
    using cout = BlackRoot::Util::Cout;
    
        // Ensure we have a sidepanel and that the sidepanel
        // has our connexions loaded

    Objects::Objectman::UUID                        panel_id;
    std::map<std::string, Objects::Objectman::UUID> panel_connexions;

    {       // Get the user persistent panel
        auto panel = this->Objectman.find_by_name(Objects::Protocol::Name_User_Persistent_Panel);

        if (nullptr == panel) {
            panel = this->Objectman.create({}, Objects::Protocol::Type_Panel, {});
            this->Objectman.give_name(panel->ID, Objects::Protocol::Name_User_Persistent_Panel);
        }
        else if (panel->Base_Type_Name != Objects::Protocol::Type_Panel) {
            panel = this->Objectman.replace(panel->ID, Objects::Protocol::Type_Panel, {});
        }

            // Create a map of existing connexions
        for (auto uuid : panel->Child_IDs) {
            auto item = this->Objectman.get(uuid);
            DbAssert(item);

                // We are only interested in connexions
            if (item->Base_Type_Name != Objects::Protocol::Type_Connexion)
                continue;

                // Add it to the map as existing connexion
            auto itName = item->Object_Description.find(Objects::Protocol::Name_Connexion_Name);
            DbAssert(itName->is_string());
            panel_connexions[itName->get<std::string>()] = uuid;
        }

        panel_id = panel->ID;
    }

        // Go through our enumeration and update or
        // create where needed; we just violently override
        // as we only really do this during startup
    for (const auto & it : this->Connextion_Enum.get_connexions()) {
        Objects::Objectman::UUID found{};
        
        JSON desc;
        desc[Objects::Protocol::Name_Connexion_Name] = it.Name;
        desc[Objects::Protocol::Name_Connexion_Host] = "*";
        desc[Objects::Protocol::Name_Connexion_Port] = it.Port;
        
        auto find = panel_connexions.find(it.Name);
        if (find != panel_connexions.end()) {
            this->Objectman.replace(find->second, Objects::Protocol::Type_Connexion, desc);
            this->DirtyObjects.push_back(find->second);
        }

        cout{} << "Layouts adding connexion item '" << it.Name << "'" << std::endl;
        auto obj = this->Objectman.create(panel_id, Objects::Protocol::Type_Connexion, desc);
        
        this->DirtyObjects.push_back(obj->ID);
    }

    this->DirtyObjects.push_back(panel_id);
}

    //  Handle
    // --------------------

void Layouts::internal_handle_conduit_layout_message(Conduits::Raw::ConduitRef, Conduits::Raw::IRelayMessage * msg)
{
    this->rmr_handle_message_immediate_and_release(msg);
}

void Layouts::internal_conduit_handler()
{
    // TODO: extreme todo, always true
    while (true) {
        this->Message_Nexus->await_message_and_handle();
    }
}

    //  Connexions
    // --------------------

void Layouts::update_connexion_enumeration()
{
	this->Connextion_Enum.add_from_directory(this->Layout_Props.Setup_Dir / "Connexions");
    this->internal_ensure_objectman_elements();
}

void Layouts::_conduit_connect_layouts(Conduits::Raw::IRelayMessage * msg) noexcept
{
    using cout = BlackRoot::Util::Cout;

    cout{} << "Connect";

    Conduits::FunctionOpenConduitHandler handler([&](Conduits::FunctionOpenConduitHandler::Result r){
        if (!r.Is_Success) {
            msg->set_response_string_with_copy("Opening conduit failed");
            msg->set_FAILED();
            return;
        }

        this->Active_Conduits.push_back(r.Ref);

        this->Message_Nexus->manual_acknowledge_conduit(r.Ref,
            [&](Conduits::Raw::ConduitRef, const Conduits::ConduitUpdateInfo) {
            },
            std::bind(&Layouts::internal_handle_conduit_layout_message, this, std::placeholders::_1, std::placeholders::_2)
        );
        msg->set_OK_opened_conduit();
    });
    msg->open_conduit_for_sender(this->Message_Nexus, &handler);
}

bool Layouts::async_relay_message(Conduits::Raw::IRelayMessage * msg) noexcept
{
    this->Message_Nexus->async_add_ad_hoc_message(msg);
    return true;
}

    //  Manipulate
    // --------------------

void Layouts::internal_replace_children_from_command(const JSON json)
{
    using cout = BlackRoot::Util::Cout;

    std::string str = json.dump();

    for (auto ref : this->Active_Conduits) {
        auto * msg = new Conduits::DisposableMessage();
        msg->Path = "update_state_for_uuid";
        msg->Message_Segments[0] = str;
        msg->Response_Desire = Conduits::ResponseDesire::not_needed;
        msg->sender_prepare_for_send();
        this->Message_Nexus->send_on(ref, msg);
    }
}

    //  Settings
    // --------------------

void Layouts::set_setup_dir(Path path)
{
    this->Layout_Props.Setup_Dir = Toolbox::Core::Get_Environment()->expand_dir(path);
	this->update_connexion_enumeration();
}

    //  Util
    // --------------------

Layouts::JSON Layouts::get_connexion_enumeration() const
{
	const auto & list = this->Connextion_Enum.get_connexions();

	JSON res = JSON::array();

	for (const auto & elem : list) {
		res.push_back({ { "name", elem.Name }, { "port", elem.Port }, { "icon", elem.Icon } });
	}

	return res;
}

Layouts::Path Layouts::get_setup_dir()
{
    return this->Layout_Props.Setup_Dir;
}

    //  Message
    // --------------------

void Layouts::_ping(Conduits::Raw::IRelayMessage * msg) noexcept
{
    using cout = BlackRoot::Util::Cout;
    cout{} << "Iris layouts says 'pong'!" << std::endl;

    BlackRoot::System::PlayAdHocSound(Toolbox::Core::Get_Environment()->get_ref_dir() / "Data/ping.wav");
    BlackRoot::System::FlashCurrentWindow();

    this->savvy_try_wrap_write_json(msg, 0, [&] {
        JSON ret = { "Iris Layouts says 'pong'" };
        msg->set_OK();
        return ret;
    });
}

void Layouts::_commence(Conduits::Raw::IRelayMessage *) noexcept
{
    this->commence();
}

void Layouts::_end_and_wait(Conduits::Raw::IRelayMessage *) noexcept
{
    this->end_and_wait();
}

void Layouts::_get_uuid_for_name(Conduits::Raw::IRelayMessage *msg) noexcept
{
    savvy_try_wrap_read_write_json(msg, 0, 0, [&](JSON request) {
        auto & it = request.find("name");
        DbAssertMsgFatal(it != request.end(), "No name was specified");

        JSON ret;

        std::string name = it->get<std::string>();
        auto obj = this->Objectman.find_by_name(name);
        
        if (nullptr == obj) {
            ret["uuid"] = "00000000-0000-0000-0000-000000000000";
        }
        else {
            ret["uuid"] = BlackRoot::Identify::UUID_To_String(obj->ID);
        }

        msg->set_OK();

        return ret;
    });
}

void Layouts::_get_state_for_uuids(Conduits::Raw::IRelayMessage *msg) noexcept
{
    savvy_try_wrap_read_write_json(msg, 0, 0, [&](JSON request) {
        DbAssertMsgFatal(request.is_array(), "Request must be array of string uuids");
        
        JSON ret;

        for (auto & elem : request) {
            DbAssertMsgFatal(elem.is_string(), "Request must be array of string uuids");
            
            std::string uuid = elem.get<std::string>();
            ret[uuid] = this->Objectman.get_json(*BlackRoot::Identify::UUID::from_string(uuid));
        }

        msg->set_OK();

        return ret;
    });
}

void Layouts::_update_state_for_uuid(Conduits::Raw::IRelayMessage *msg) noexcept
{
    savvy_try_wrap_read_json(msg, 0, [&](JSON request) {
        DbAssertMsgFatal(request.is_object(), "Request must update object");
            
        auto type = request["type"];
        if (type == "change-children") {
            this->internal_replace_children_from_command(request);
        }

        msg->set_OK();
    });
}