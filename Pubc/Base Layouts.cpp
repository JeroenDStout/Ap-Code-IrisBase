/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"
#include "BlackRoot/Pubc/Exception.h"
#include "BlackRoot/Pubc/Sys Path.h"

#include "Conduits/Pubc/Base Conduit.h"

#include "ToolboxBase/Pubc/Interface Environment.h"

#include "IrisBase/Pubc/Base Layouts.h"

using namespace IrisBack::Base;
namespace fs = std::experimental::filesystem;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(Layouts);
CON_RMR_REGISTER_FUNC(Layouts, conduit_connect_layouts);

    //  Setup
    // --------------------

void Layouts::initialise(const JSON param)
{
    this->Conduit_Handler = std::thread([&] {
        this->internal_conduit_handler();
    });
}

void Layouts::deinitialise(const JSON param)
{
}

    //  Handle
    // --------------------

void Layouts::internal_handle_conduit_layout_message(Conduits::Raw::ConduitRef, Conduits::Raw::IRelayMessage * msg)
{
    using cout = BlackRoot::Util::Cout;

    cout{} << msg->get_path_string();

    std::string str = "You told me '";
    str.append(msg->get_path_string());
    str.append("'!");

    msg->set_response_string_with_copy(str.c_str());
    msg->set_OK();
    msg->release();
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
        this->Message_Nexus->manual_acknowledge_conduit(r.Ref,
            [&](Conduits::Raw::ConduitRef, const Conduits::ConduitUpdateInfo) {
            },
            std::bind(&Layouts::internal_handle_conduit_layout_message, this, std::placeholders::_1, std::placeholders::_2)
        );
        msg->set_OK_opened_conduit();
    });
    msg->open_conduit_for_sender(this->Message_Nexus, &handler);
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