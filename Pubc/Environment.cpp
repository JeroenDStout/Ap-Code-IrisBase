/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"

#include "IrisBase/Pubc/Environment.h"
#include "IrisBase/Pubc/Base Layouts.h"

using namespace IrisBack::Core;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(Environment);
CON_RMR_REGISTER_FUNC(Environment, create_layouts);

    //  Setup
    // --------------------

Environment::Environment()
{
}

Environment::~Environment()
{
}

    //  Control
    // --------------------

void Environment::create_layouts()
{
    using namespace std::placeholders;

    this->Layouts = this->internal_allocate_layouts();
    this->Layouts->initialise({});
    
    this->Simple_Relay.Call_Map["lay"] = std::bind(&Core::ILayouts::async_relay_message, this->Layouts, _1);
    
    this->Layouts->commence();
}

void Environment::internal_unload_all()
{
    this->RelayReceiverBaseClass::internal_unload_all();

    if (this->Layouts) {
        this->Layouts->end_and_wait();
        this->Layouts->deinitialise({});
    }

    this->Simple_Relay.Call_Map.erase("lay");

}

    //  Util
    // --------------------

void Environment::internal_compile_stats(JSON & json)
{
    this->RelayReceiverBaseClass::internal_compile_stats(json);
}

void Environment::internal_handle_web_request(std::string path, Conduits::Raw::IMessage * msg)
{
		// all command paths over http end in 'http'; i.e., an empty
		// path is represented by 'http', which we want to forward
		// to the iris.html path
	if (path.length() == 0 || path == "http") {
		path = "iris/index.html";
	}
	else if (path == "iris/connexions.json/http") {
        DbAssertMsgFatal(this->Layouts, "Layouts has not been loaded");

        std::unique_ptr<Conduits::DisposableMessage> reply(new Conduits::DisposableMessage());
        reply->Segment_Map["header"] = JSON({ "Content-Type", "application/json" }).dump();
        reply->Segment_Map["body"]   = this->Layouts->get_connexion_enumeration().dump();

        reply->sender_prepare_for_send();

        msg->set_response(reply.release());
		msg->set_OK();
		return;
	}

	this->BaseEnvironment::internal_handle_web_request(path, msg);
}

    //  Typed
    // --------------------

ILayouts * Environment::internal_allocate_layouts()
{
	return new Base::Layouts;
}

    //  Messages
    // --------------------

void Environment::_create_layouts(Conduits::Raw::IMessage * msg) noexcept
{
    this->savvy_try_wrap(msg, [&] {
        DbAssertMsgFatal(!this->Layouts, "Layouts already exists");
        this->create_layouts();
        msg->set_OK();
    });
}