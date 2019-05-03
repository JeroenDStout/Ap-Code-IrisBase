/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"

#include "Conduits/Pubc/Disposable Message.h"

#include "IrisBase/Pubc/Interface Layouts.h"

using namespace IrisBack::Core;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(ILayouts);
CON_RMR_REGISTER_FUNC(ILayouts, set_setup_dir);

void ILayouts::_set_setup_dir(Conduits::Raw::IMessage * msg) noexcept
{
    using cout = BlackRoot::Util::Cout;

    this->savvy_try_wrap_read_json(msg, "", [&](JSON json) {
        if (json.is_object()) {
            json = json["path"];
        }
        DbAssertMsgFatal(json.is_string(), "Malformed JSON: cannot get path");
        
        this->set_setup_dir(json.get<JSON::string_t>());


        if (Conduits::Raw::ResponseDesire::response_is_possible(msg->get_response_expectation())) {
            std::unique_ptr<Conduits::DisposableMessage> reply(new Conduits::DisposableMessage());

            reply->Message_String = "Iris setup dir has been set to ";
            reply->Message_String += this->get_setup_dir().string();

            reply->sender_prepare_for_send();

            msg->set_response(reply.release());
        }

        msg->set_OK();
    });
}